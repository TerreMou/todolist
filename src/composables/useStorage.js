import { computed, ref } from 'vue';
import { STORAGE_KEY, STORAGE_KEY_PROJECTS, TRASH_RETENTION_DAYS } from '@/constants';
import { format } from 'date-fns';

const MAGIC_KEY_STORAGE = 'jos-todo-list-magic-key';
const STORAGE_MODE_KEY = 'jos-todo-list-storage-mode';
const LOCAL_META_KEY = 'jos-todo-list-local-meta';
const SNAPSHOTS_KEY = 'jos-todo-list-snapshots';
const MAX_SNAPSHOTS = 5;

const STORAGE_MODES = {
  LOCAL_ONLY: 'local_only',
  REMOTE_AUTO: 'remote_auto'
};

const VALID_STORAGE_MODES = new Set(Object.values(STORAGE_MODES));

const normalizeMode = (value) => (VALID_STORAGE_MODES.has(value) ? value : STORAGE_MODES.LOCAL_ONLY);

const normalizeISO = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const readJson = (key, fallback) => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

/**
 * 存储管理 composable
 * @returns {Object} 存储相关的方法
 */
export const useStorage = () => {
  const storageMode = ref(normalizeMode(localStorage.getItem(STORAGE_MODE_KEY)));
  const storageStatus = ref(storageMode.value === STORAGE_MODES.LOCAL_ONLY ? 'local_only' : 'idle');
  const storageMessage = ref('');
  const magicKey = ref(localStorage.getItem(MAGIC_KEY_STORAGE) || '');
  const conflictState = ref(null);
  const snapshots = ref(readJson(SNAPSHOTS_KEY, []));

  let pendingSavePayload = null;
  let isSaving = false;
  let saveTimer = null;

  const canUseRemote = computed(() => storageMode.value === STORAGE_MODES.REMOTE_AUTO);

  const isAutoSyncMode = computed(() => storageMode.value === STORAGE_MODES.REMOTE_AUTO);

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

  const readLocalMeta = () => {
    const meta = readJson(LOCAL_META_KEY, null);
    return {
      updatedAt: normalizeISO(meta?.updatedAt)
    };
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

  const persistStorageMode = (mode) => {
    const normalized = normalizeMode(mode);
    storageMode.value = normalized;
    localStorage.setItem(STORAGE_MODE_KEY, normalized);
  };

  const persistLocalState = (tasks, projects, updatedAt = new Date().toISOString()) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    localStorage.setItem(LOCAL_META_KEY, JSON.stringify({ updatedAt: normalizeISO(updatedAt) || new Date().toISOString() }));
  };

  const pushSnapshot = (reason, state, metadata = {}) => {
    if (!state) return;

    const record = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      reason,
      metadata,
      state: {
        tasks: state.tasks,
        projects: state.projects
      }
    };

    const next = [record, ...snapshots.value].slice(0, MAX_SNAPSHOTS);
    snapshots.value = next;
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(next));
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

      if (storageMode.value === STORAGE_MODES.LOCAL_ONLY) {
        persistStorageMode(STORAGE_MODES.REMOTE_AUTO);
      }
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
    storageMessage.value = '密钥已清除。';
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

  const buildConflictSummary = (localState, remoteState, remoteUpdatedAt) => {
    const localMeta = readLocalMeta();
    return {
      localTaskCount: localState.tasks.length,
      localProjectCount: localState.projects.length,
      remoteTaskCount: remoteState.tasks.length,
      remoteProjectCount: remoteState.projects.length,
      localUpdatedAt: localMeta.updatedAt,
      remoteUpdatedAt: normalizeISO(remoteUpdatedAt)
    };
  };

  const setLocalOnlyStatus = (message = '当前仅使用本地存储。') => {
    storageStatus.value = 'local_only';
    storageMessage.value = message;
  };

  const loadFromLocalStorage = async (options = {}) => {
    const { detectConflict = true } = options;

    bootstrapMagicKey();
    const localState = loadLocalState();
    conflictState.value = null;

    if (!canUseRemote.value) {
      setLocalOnlyStatus('当前仅使用本地存储。');
      return localState;
    }

    if (!magicKey.value.trim()) {
      setLocalOnlyStatus('未配置密钥，当前仅本地模式。');
      return localState;
    }

    try {
      const remoteState = await requestState('state-get', 'GET');
      const hasLocalData = hasAnyData(localState);

      if (remoteState.empty) {
        if (hasLocalData) {
          await requestState('state-migrate', 'POST', localState);
          storageStatus.value = 'remote_ready';
          storageMessage.value = '已将本地数据初始化到远程。';
          return localState;
        }

        const emptyState = { tasks: [], projects: [] };
        persistLocalState(emptyState.tasks, emptyState.projects);
        storageStatus.value = 'remote_ready';
        storageMessage.value = '远程数据库已连接。';
        return emptyState;
      }

      const normalizedTasks = normalizeTasks(Array.isArray(remoteState.tasks) ? remoteState.tasks : []);
      const normalizedProjects = normalizeProjects(Array.isArray(remoteState.projects) ? remoteState.projects : []);
      const cleaned = cleanExpiredTrash(normalizedTasks, normalizedProjects);

      if (detectConflict && hasAnyData(localState) && hasAnyData(cleaned) && !isSameState(localState, cleaned)) {
        conflictState.value = {
          local: localState,
          remote: cleaned,
          remoteUpdatedAt: normalizeISO(remoteState.updatedAt),
          summary: buildConflictSummary(localState, cleaned, remoteState.updatedAt)
        };
        storageStatus.value = 'conflict';
        storageMessage.value = '检测到本地与远程数据不一致，请确认使用哪个版本。';
        return localState;
      }

      persistLocalState(cleaned.tasks, cleaned.projects, remoteState.updatedAt || new Date().toISOString());
      storageStatus.value = 'remote_ready';
      storageMessage.value = '远程数据库已连接。';
      return cleaned;
    } catch (error) {
      if (error.status === 401) {
        storageStatus.value = 'remote_error';
        storageMessage.value = '密钥无效，已回退到本地模式。';
      } else {
        storageStatus.value = 'remote_error';
        storageMessage.value = '远程不可用，已回退到本地模式。';
      }
      console.error('Failed to load remote state:', error);
      return localState;
    }
  };

  const flushRemoteSave = async () => {
    if (isSaving || !pendingSavePayload) return;
    if (!isAutoSyncMode.value || !canUseRemote.value || !magicKey.value.trim()) return;

    isSaving = true;
    while (pendingSavePayload) {
      const currentPayload = pendingSavePayload;
      pendingSavePayload = null;

      try {
        await requestState('state-save', 'POST', currentPayload);
        storageStatus.value = 'remote_ready';
        storageMessage.value = '远程自动同步成功。';
      } catch (error) {
        storageStatus.value = 'remote_error';
        storageMessage.value = error.status === 401
          ? '密钥无效，自动同步已暂停。'
          : '远程保存失败，当前继续本地保存。';
        console.error('Failed to save remote state:', error);
      }
    }

    isSaving = false;
  };

  const saveToLocalStorage = (tasks, projects) => {
    persistLocalState(tasks, projects);

    if (storageStatus.value === 'conflict') {
      return;
    }

    if (!isAutoSyncMode.value || !canUseRemote.value) {
      if (!canUseRemote.value) {
        setLocalOnlyStatus('当前仅使用本地存储。');
      }
      return;
    }

    if (!magicKey.value.trim()) {
      storageStatus.value = 'remote_error';
      storageMessage.value = '缺少密钥，自动同步已暂停。';
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

  const syncToRemote = async (tasks, projects) => {
    if (!canUseRemote.value) {
      setLocalOnlyStatus('当前为本地模式，未执行远程同步。');
      return { ok: false, reason: 'local_only' };
    }

    if (!magicKey.value.trim()) {
      storageStatus.value = 'remote_error';
      storageMessage.value = '缺少密钥，无法同步到远程。';
      return { ok: false, reason: 'missing_key' };
    }

    try {
      await requestState('state-save', 'POST', { tasks, projects });
      storageStatus.value = 'remote_ready';
      storageMessage.value = '已手动同步到远程。';
      return { ok: true };
    } catch (error) {
      storageStatus.value = 'remote_error';
      storageMessage.value = error.status === 401 ? '密钥无效，无法同步。' : '远程同步失败。';
      throw error;
    }
  };

  const resolveConflict = async (strategy) => {
    if (!conflictState.value) return null;

    const localState = conflictState.value.local;
    const remoteState = conflictState.value.remote;

    if (strategy === 'local') {
      pushSnapshot('before_local_overwrite_remote', localState, conflictState.value.summary || {});
      await requestState('state-save', 'POST', localState);
      persistLocalState(localState.tasks, localState.projects);
      conflictState.value = null;
      storageStatus.value = 'remote_ready';
      storageMessage.value = '已保留本地并覆盖远程。';
      return localState;
    }

    pushSnapshot('before_remote_overwrite_local', localState, conflictState.value.summary || {});
    persistLocalState(remoteState.tasks, remoteState.projects, conflictState.value.remoteUpdatedAt || new Date().toISOString());
    conflictState.value = null;
    storageStatus.value = 'remote_ready';
    storageMessage.value = '已采用远程数据。';
    return remoteState;
  };

  const restoreSnapshot = (snapshotId) => {
    const hit = snapshots.value.find(s => s.id === snapshotId);
    if (!hit) return null;

    const nextTasks = normalizeTasks(Array.isArray(hit.state?.tasks) ? hit.state.tasks : []);
    const nextProjects = normalizeProjects(Array.isArray(hit.state?.projects) ? hit.state.projects : []);
    persistLocalState(nextTasks, nextProjects);

    return { tasks: nextTasks, projects: nextProjects, snapshot: hit };
  };

  const setMode = (mode) => {
    persistStorageMode(mode);

    if (storageMode.value === STORAGE_MODES.LOCAL_ONLY) {
      storageStatus.value = 'local_only';
      storageMessage.value = '已切换为本地模式。';
      conflictState.value = null;
      return;
    }

    storageStatus.value = 'idle';
    storageMessage.value = '已切换到远程自动模式。';
  };

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
      }

      throw new Error('格式无效');
    } catch (err) {
      console.error('Import failed:', err);
      showNotification('导入失败：文件格式错误', 'error');
      return false;
    }
  };

  return {
    STORAGE_MODES,
    storageMode,
    canUseRemote,
    isAutoSyncMode,
    storageStatus,
    storageMessage,
    magicKey,
    conflictState,
    snapshots,
    setMode,
    setMagicKey,
    clearMagicKey,
    resolveConflict,
    restoreSnapshot,
    loadFromLocalStorage,
    saveToLocalStorage,
    syncToRemote,
    exportData,
    importData
  };
};
