// 存储和基础配置
export const STORAGE_KEY = 'jos-todo-list-data';
export const STORAGE_KEY_PROJECTS = 'jos-todo-list-projects';
export const TRASH_RETENTION_DAYS = 30;
export const NOTIFICATION_DURATION = 3000;
export const DEFAULT_TIME = '12:00';

// 分类选项
export const CATEGORY_OPTIONS = ['MKT', 'Event', 'Payment', 'Others'];

// 优先级样式配置
export const PRIORITY_STYLES_CONFIG = {
  high: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  medium: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  none: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
};

// 项目状态选项
export const PROJECT_STATUS_OPTIONS = [
  { value: 'not_started', label: '未开始', color: 'bg-slate-100 text-slate-500' },
  { value: 'in_progress', label: '进行中', color: 'bg-blue-100 text-blue-600' },
  { value: 'completed', label: '已完成', color: 'bg-green-100 text-green-600' }
];

// 优先级数值映射（用于排序）
export const PRIORITY_MAP = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0
};
