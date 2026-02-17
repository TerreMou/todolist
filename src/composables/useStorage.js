import { ref, watch } from 'vue';
import { STORAGE_KEY, STORAGE_KEY_PROJECTS, TRASH_RETENTION_DAYS } from '@/constants';
import { format } from 'date-fns';

/**
 * 存储管理 composable
 * @returns {Object} 存储相关的方法
 */
export const useStorage = () => {
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

  /**
   * 从 localStorage 加载任务和项目
   * @returns {Object} { tasks, projects }
   */
  const loadFromLocalStorage = () => {
    let tasks = [];
    let projects = [];

    // 加载任务
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        tasks = normalizeTasks(parsed);
      } catch (e) {
        console.error('Failed to load tasks:', e);
        tasks = [];
      }
    }

    // 加载项目
    const savedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        projects = normalizeProjects(parsed);
      } catch (e) {
        console.error('Failed to load projects:', e);
        projects = [];
      }
    }

    // 清理过期的已删除项目
    const thirtyDaysAgo = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    tasks = tasks.filter(
      t => !t.isDeleted || (t.isDeleted && new Date(t.deletedAt).getTime() > thirtyDaysAgo)
    );
    projects = projects.filter(
      p => !p.isDeleted || (p.isDeleted && new Date(p.deletedAt).getTime() > thirtyDaysAgo)
    );

    return { tasks, projects };
  };

  /**
   * 保存任务和项目到 localStorage
   * @param {Array} tasks - 任务数组
   * @param {Array} projects - 项目数组
   */
  const saveToLocalStorage = (tasks, projects) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
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

  return {
    loadFromLocalStorage,
    saveToLocalStorage,
    exportData,
    importData
  };
};
