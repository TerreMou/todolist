import { ref } from 'vue';
import { STORAGE_KEY, STORAGE_KEY_PROJECTS, TRASH_RETENTION_DAYS } from '@/constants';
import { format } from 'date-fns';

const MAGIC_KEY_STORAGE = 'jos-todo-list-magic-key';

/**
 * 存储管理 composable
 * @returns {Object} 存储相关的方法
 */
export const useStorage = () => {
  const storageStatus = ref('idle');
  const storageMessage = ref('');
  const magicKey = ref(localStorage.getItem(MAGIC_KEY_STORAGE) || '');
  const conflictState = ref(null);

  let pendingSavePayload = null;
  let isSaving = false;
  let saveTimer = null;

  const normalizeTasks = (rawTasks) => rawTasks.map(t => {
    const legacyType = Array.isArray(t.categories) && t.categories.length > 0 ? t.categories[0] : '';
    return {
      ...t,
      desc: typeof t.desc === 'string' ? t.desc : '',
      taskType: typeof t.taskType === 'string' ? t.taskType : legacyType,
      contact: typeof t.contact === 'string' ? t.contact : '',
      projectId: t.projectId ?? null
    };
  });

  const normalizeProjects = (rawProjects) => rawProjects.map((p, index) => ({
    ...p,
    status: p.status || 'not_started',
    sortOrder: p.sortOrder !== undefined ? p.sortOrder : index * 1000
  }));

  const cleanExpiredTrash = (tasks, projects) => {
    const deadline = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return {
      tasks: tasks.filter(t => !t.isDeleted || (t.isDeleted && new Date(t.deletedAt).getTime() > deadline)),
      projects: projects.filter(p => !p.isDeleted || (p.isDeleted && new Date(p.deletedAt).getTime() > deadline))
    };
  };

  const loadLocalState = () => {
    let tasks = [];
    let projects = [];

    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (savedTasks) {
      try {
        tasks = normalizeTasks(JSON.parse(savedTasks));
      } catch (e) {
        console.error('Failed to load tasks:', e);
      }
    }

    const savedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (savedProjects) {
      try {
        projects = normalizeProjects(JSON.parse(savedProjects));
      } catch (e) {
        console.error('Failed to load projects:', e);
      }
    }

    return cleanExpiredTrash(tasks, projects);
  };

  const hasAnyData = (state) => state.tasks.length > 0 || state.projects.length > 0;

  const canonicalize = (value) => {
    if (Array.isArray(value)) {
      return value.map(canonicalize);
    }

    if (value && typeof value === 'object') {
      const sorted = {};
      Object.keys(value)
        .sort()
        .forEach((key) => {
          const next = value[key];
          if (next !== undefined) {
            sorted[key] = canonicalize(next);
          }
        });
      return sorted;
    }

    return value;
  };

  const stableStringify = (value) => JSON.stringify(canonicalize(value));

  const isSameState = (left, right) => {
    if (!left || !right) return false;
    return stableStringify(left.tasks) === stableStringify(right.tasks)
      && stableStringify(left.projects) === stableStringify(right.projects);
  };

  const persistLocalState = (tasks, projects) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  };

  const getMagicKeyFromHash = () => {
    const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    if (!raw) return '';

    const params = new URLSearchParams(raw);
    const hashKey = (params.get('key') || '').trim();
    if (!hashKey) return '';

    params.delete('key');
    const nextHash = params.toString();
    const url = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
    window.history.replaceState({}, document.title, url);

    return hashKey;
  };

  const bootstrapMagicKey = () => {
    const fromHash = getMagicKeyFromHash();
    if (fromHash) {
      localStorage.setItem(MAGIC_KEY_STORAGE, fromHash);
      magicKey.value = fromHash;
    }
  };

  const setMagicKey = (key) => {
    const next = (key || '').trim();
    magicKey.value = next;

    if (next) {
      localStorage.setItem(MAGIC_KEY_STORAGE, next);
      return;
    }

    localStorage.removeItem(MAGIC_KEY_STORAGE);
  };

  const clearMagicKey = () => {
    setMagicKey('');
    storageStatus.value = 'missing_key';
    storageMessage.value = '密钥已清除，请重新输入。';
  };

  const requestState = async (path, method, payload) => {
    const key = (magicKey.value || '').trim();
    if (!key) {
      const err = new Error('Missing magic key');
      err.code = 'missing_key';
      throw err;
    }

    const options = {
      method,
      headers: {
        'content-type': 'application/json',
        'x-magic-key': key
      }
    };

    if (payload !== undefined) {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(`/.netlify/functions/${path}`, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data?.error || 'Request failed');
      err.status = response.status;
      throw err;
    }

    return data;
  };

  const loadFromLocalStorage = async () => {
    bootstrapMagicKey();
    const localState = loadLocalState();
    conflictState.value = null;

    if (!magicKey.value.trim()) {
      storageStatus.value = 'missing_key';
      storageMessage.value = '请输入密钥以连接远程数据库。';
      return localState;
    }

    try {
      const remoteState = await requestState('state-get', 'GET');
      const hasLocalData = localState.tasks.length > 0 || localState.projects.length > 0;

      if (remoteState.empty && hasLocalData) {
        await requestState('state-migrate', 'POST', localState);
        storageStatus.value = 'ready';
        storageMessage.value = '已将本地数据迁移到远程数据库。';
        return localState;
      }

      const normalizedTasks = normalizeTasks(Array.isArray(remoteState.tasks) ? remoteState.tasks : []);
      const normalizedProjects = normalizeProjects(Array.isArray(remoteState.projects) ? remoteState.projects : []);
      const cleaned = cleanExpiredTrash(normalizedTasks, normalizedProjects);

      if (hasAnyData(localState) && hasAnyData(cleaned) && !isSameState(localState, cleaned)) {
        conflictState.value = {
          local: localState,
          remote: cleaned
        };
        storageStatus.value = 'conflict';
        storageMessage.value = '检测到本地与远程数据不一致，请确认使用哪个版本。';
        return localState;
      }

      persistLocalState(cleaned.tasks, cleaned.projects);
      storageStatus.value = 'ready';
      storageMessage.value = '';
      return cleaned;
    } catch (error) {
      if (error.code === 'missing_key') {
        storageStatus.value = 'missing_key';
        storageMessage.value = '请输入密钥以连接远程数据库。';
      } else if (error.status === 401) {
        storageStatus.value = 'auth_failed';
        storageMessage.value = '密钥无效，请重新输入。';
      } else {
        storageStatus.value = 'network_error';
        storageMessage.value = '远程数据库不可用，暂时使用本地数据。';
      }
      console.error('Failed to load remote state:', error);
      return localState;
    }
  };

  const flushRemoteSave = async () => {
    if (isSaving || !pendingSavePayload) return;

    isSaving = true;
    while (pendingSavePayload) {
      const currentPayload = pendingSavePayload;
      pendingSavePayload = null;

      try {
        await requestState('state-save', 'POST', currentPayload);
        storageStatus.value = 'ready';
        storageMessage.value = '';
      } catch (error) {
        if (error.status === 401) {
          storageStatus.value = 'auth_failed';
          storageMessage.value = '密钥无效，请重新输入。';
        } else {
          storageStatus.value = 'network_error';
          storageMessage.value = '远程保存失败，数据仅保存在本地。';
        }
        console.error('Failed to save remote state:', error);
      }
    }

    isSaving = false;
  };

  /**
   * 保存任务和项目到本地，并异步同步到远程
   * @param {Array} tasks - 任务数组
   * @param {Array} projects - 项目数组
   */
  const saveToLocalStorage = (tasks, projects) => {
    persistLocalState(tasks, projects);

    if (storageStatus.value === 'conflict') {
      return;
    }

    if (!magicKey.value.trim()) {
      storageStatus.value = 'missing_key';
      storageMessage.value = '未配置密钥，当前仅保存到本地。';
      return;
    }

    pendingSavePayload = { tasks, projects };

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
      flushRemoteSave();
    }, 500);
  };

  /**
   * 导出数据为 JSON
   * @param {Array} tasks - 任务数组
   * @param {Array} projects - 项目数组
   * @param {Function} showNotification - 通知函数
   */
  const exportData = (tasks, projects, showNotification) => {
    const data = {
      tasks,
      projects,
      version: '2.0-refactored',
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jos-todo-backup-${format(new Date(), 'yyyyMMdd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('数据导出成功');
  };

  /**
   * 导入数据
   * @param {Object} data - 导入的数据对象
   * @param {Array} tasks - 任务 ref
   * @param {Array} projects - 项目 ref
   * @param {Function} showNotification - 通知函数
   * @returns {boolean} 导入是否成功
   */
  const importData = (data, tasksRef, projectsRef, showNotification) => {
    try {
      if (Array.isArray(data.tasks) && Array.isArray(data.projects)) {
        const normalizedTasks = normalizeTasks(data.tasks);
        const normalizedProjects = normalizeProjects(data.projects);
        tasksRef.value = normalizedTasks;
        projectsRef.value = normalizedProjects;
        saveToLocalStorage(normalizedTasks, normalizedProjects);
        showNotification('数据恢复成功！');
        return true;
      } else {
        throw new Error('格式无效');
      }
    } catch (err) {
      console.error('Import failed:', err);
      showNotification('导入失败：文件格式错误', 'error');
      return false;
    }
  };

  const resolveConflict = async (strategy) => {
    if (!conflictState.value) return null;

    const localState = conflictState.value.local;
    const remoteState = conflictState.value.remote;

    if (strategy === 'local') {
      try {
        await requestState('state-save', 'POST', localState);
        persistLocalState(localState.tasks, localState.projects);
        conflictState.value = null;
        storageStatus.value = 'ready';
        storageMessage.value = '';
        return localState;
      } catch (error) {
        if (error.status === 401) {
          storageStatus.value = 'auth_failed';
          storageMessage.value = '密钥无效，请重新输入。';
        } else {
          storageStatus.value = 'network_error';
          storageMessage.value = '远程写入失败，请稍后再试。';
        }
        throw error;
      }
    }

    persistLocalState(remoteState.tasks, remoteState.projects);
    conflictState.value = null;
    storageStatus.value = 'ready';
    storageMessage.value = '';
    return remoteState;
  };

  return {
    storageStatus,
    storageMessage,
    magicKey,
    conflictState,
    setMagicKey,
    clearMagicKey,
    resolveConflict,
    loadFromLocalStorage,
    saveToLocalStorage,
    exportData,
    importData
  };
};
