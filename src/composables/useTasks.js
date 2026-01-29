import { computed } from 'vue';
import { DEFAULT_TIME } from '@/constants';
import { combineDateTime, extractDateFromISO, extractTimeFromISO } from '@/utils/dateTime';
import {
  validateTaskTitle,
  validateDueDate,
  sortAndFilterTasks
} from '@/utils/validators';

/**
 * 任务管理 composable
 * @param {Ref} tasksRef - 任务数组 ref
 * @param {Ref} projectsRef - 项目数组 ref
 * @param {Function} showNotification - 通知函数
 * @returns {Object} 任务相关的状态和方法
 */
export const useTasks = (tasksRef, projectsRef, showNotification) => {
  // 计算属性
  const activeTasks = computed(() => tasksRef.value.filter(t => !t.isDeleted));
  const trashTasks = computed(() => tasksRef.value.filter(t => t.isDeleted));

  /**
   * 获取排序和过滤后的任务
   */
  const getSortedFilteredTasks = (
    sourceTasks,
    searchQuery,
    filterStatus,
    filterCategories
  ) => {
    return sortAndFilterTasks(sourceTasks, searchQuery, filterStatus, filterCategories);
  };

  /**
   * 创建新任务
   */
  const createTask = (title, desc, priority, dueDate, categories, projectId) => {
    if (!validateTaskTitle(title, showNotification)) return false;
    if (!validateDueDate(dueDate, false, showNotification)) return false;

    const safeCategories = Array.isArray(categories) ? [...categories] : [];
    const safeProjectId = projectId === 'none' ? null : projectId;

    tasksRef.value.push({
      id: Date.now(),
      title,
      desc,
      priority,
      dueDate,
      categories: safeCategories,
      projectId: safeProjectId,
      completed: false,
      isDeleted: false,
      createdAt: new Date().toISOString()
    });

    showNotification('任务已创建');
    return true;
  };

  /**
   * 更新任务
   */
  const updateTask = (taskId, title, desc, priority, dueDate, categories, projectId) => {
    if (!validateTaskTitle(title, showNotification)) return false;
    if (!validateDueDate(dueDate, true, showNotification)) return false;

    const index = tasksRef.value.findIndex(t => t.id === taskId);
    if (index === -1) return false;

    const safeCategories = Array.isArray(categories) ? [...categories] : [];
    const safeProjectId = projectId === 'none' ? null : projectId;

    tasksRef.value[index] = {
      ...tasksRef.value[index],
      title,
      desc,
      priority,
      dueDate,
      categories: safeCategories,
      projectId: safeProjectId
    };

    showNotification('任务已更新');
    return true;
  };

  /**
   * 切换任务完成状态
   */
  const toggleTaskStatus = (taskId) => {
    const task = tasksRef.value.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
    }
  };

  /**
   * 编辑任务时提取数据
   */
  const prepareTaskForEdit = (task) => {
    return {
      title: task.title,
      desc: task.desc,
      priority: task.priority,
      date: extractDateFromISO(task.dueDate),
      time: extractTimeFromISO(task.dueDate),
      categories: Array.isArray(task.categories) ? [...task.categories] : [],
      projectId: task.projectId || 'none'
    };
  };

  /**
   * 软删除任务（移至回收站）
   */
  const softDeleteTask = (taskId) => {
    const task = tasksRef.value.find(t => t.id === taskId);
    if (task) {
      task.isDeleted = true;
      task.deletedAt = new Date().toISOString();
      showNotification('已移至回收站');
      return true;
    }
    return false;
  };

  /**
   * 恢复任务
   */
  const restoreTask = (taskId) => {
    const task = tasksRef.value.find(t => t.id === taskId);
    if (task) {
      task.isDeleted = false;
      task.deletedAt = null;
      showNotification('任务已恢复');
      return true;
    }
    return false;
  };

  /**
   * 永久删除任务
   */
  const permanentDeleteTask = (taskId) => {
    const initialLength = tasksRef.value.length;
    tasksRef.value = tasksRef.value.filter(t => t.id !== taskId);
    if (tasksRef.value.length < initialLength) {
      showNotification('任务已永久删除');
      return true;
    }
    return false;
  };

  /**
   * 清空回收站（仅任务部分）
   */
  const emptyTaskTrash = () => {
    tasksRef.value = tasksRef.value.filter(t => !t.isDeleted);
    showNotification('回收站已清空');
  };

  /**
   * 根据项目 ID 获取任务统计
   */
  const getProjectTaskStats = (projectId) => {
    const projectTasks = tasksRef.value.filter(
      t => t.projectId === projectId && !t.isDeleted
    );
    const completed = projectTasks.filter(t => t.completed).length;
    const total = projectTasks.length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, progress };
  };

  return {
    activeTasks,
    trashTasks,
    getSortedFilteredTasks,
    createTask,
    updateTask,
    toggleTaskStatus,
    prepareTaskForEdit,
    softDeleteTask,
    restoreTask,
    permanentDeleteTask,
    emptyTaskTrash,
    getProjectTaskStats
  };
};
