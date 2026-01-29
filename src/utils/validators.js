import { differenceInDays } from 'date-fns';
import { PRIORITY_STYLES_CONFIG, PROJECT_STATUS_OPTIONS, PRIORITY_MAP } from '@/constants';

/**
 * 检查任务是否紧急（3 天内截止）
 * @param {Object} task - 任务对象
 * @returns {boolean}
 */
export const isUrgent = (task) => {
  if (task.completed || !task.dueDate) return false;
  const due = new Date(task.dueDate);
  const now = new Date();
  const diff = differenceInDays(due, now);
  return due > now && diff <= 3 && diff >= -1;
};

/**
 * 获取优先级的 Tailwind 样式类
 * @param {string} priority - 优先级（high/medium/low/none）
 * @returns {string} CSS 类字符串
 */
export const getPriorityStyles = (priority) =>
  PRIORITY_STYLES_CONFIG[priority] || PRIORITY_STYLES_CONFIG.none;

/**
 * 获取项目状态的样式类
 * @param {string} status - 项目状态
 * @returns {string} CSS 类字符串
 */
export const getProjectStatusStyle = (status) => {
  const s = PROJECT_STATUS_OPTIONS.find(opt => opt.value === status);
  return s ? s.color : PROJECT_STATUS_OPTIONS[0].color;
};

/**
 * 获取项目状态的显示标签
 * @param {string} status - 项目状态
 * @returns {string} 状态标签文本
 */
export const getProjectStatusLabel = (status) => {
  const s = PROJECT_STATUS_OPTIONS.find(opt => opt.value === status);
  return s ? s.label : '未开始';
};

/**
 * 验证任务标题
 * @param {string} title - 任务标题
 * @param {Function} showNotification - 通知函数
 * @returns {boolean}
 */
export const validateTaskTitle = (title, showNotification) => {
  if (!title.trim()) {
    showNotification('请输入任务标题', 'error');
    return false;
  }
  return true;
};

/**
 * 验证截止日期
 * @param {string} dueDate - ISO 格式的截止日期
 * @param {boolean} isEditing - 是否处于编辑模式
 * @param {Function} showNotification - 通知函数
 * @returns {boolean}
 */
export const validateDueDate = (dueDate, isEditing, showNotification) => {
  if (dueDate && new Date(dueDate) < new Date() && !isEditing) {
    showNotification('截止时间无效', 'error');
    return false;
  }
  return true;
};

/**
 * 验证项目标题
 * @param {string} title - 项目标题
 * @param {Function} showNotification - 通知函数
 * @returns {boolean}
 */
export const validateProjectTitle = (title, showNotification) => {
  if (!title.trim()) {
    showNotification('请输入项目名称', 'error');
    return false;
  }
  return true;
};

/**
 * 获取优先级排序权重（降序用）
 * @param {string} priority - 优先级
 * @returns {number}
 */
export const getPriorityWeight = (priority) => PRIORITY_MAP[priority] || 0;

/**
 * 排序和过滤任务
 * @param {Array} tasks - 任务数组
 * @param {string} searchQuery - 搜索关键词
 * @param {string} filterStatus - 状态过滤（all/active/completed）
 * @param {Array} filterCategories - 分类过滤
 * @returns {Array} 排序后的任务数组
 */
export const sortAndFilterTasks = (tasks, searchQuery, filterStatus, filterCategories) => {
  let result = tasks;

  // 搜索过滤
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    result = result.filter(
      t => t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query)
    );
  }

  // 状态过滤
  if (filterStatus === 'active') result = result.filter(t => !t.completed);
  else if (filterStatus === 'completed') result = result.filter(t => t.completed);

  // 分类过滤
  if (filterCategories.length > 0) {
    result = result.filter(
      t => t.categories && t.categories.some(c => filterCategories.includes(c))
    );
  }

  // 排序
  return result.sort((a, b) => {
    // 1. 已完成的任务放最后
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    // 2. 未完成任务：紧急优先
    if (!a.completed && !b.completed) {
      const urgentA = isUrgent(a);
      const urgentB = isUrgent(b);
      if (urgentA !== urgentB) return urgentA ? -1 : 1;
    }

    // 3. 按优先级排序（高到低）
    const priorityA = getPriorityWeight(a.priority);
    const priorityB = getPriorityWeight(b.priority);
    if (priorityA !== priorityB) return priorityB - priorityA;

    // 4. 按截止时间排序（早到晚）
    return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
  });
};
