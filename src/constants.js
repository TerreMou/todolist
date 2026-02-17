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

// 项目类型选项
export const PROJECT_TYPE_OPTIONS = [
  { value: 'mkt', label: 'MKT 内部' },
  { value: 'business_line', label: '业务线' },
  { value: 'others', label: '其他' }
];

// 活动类型选项
export const EVENT_TYPE_OPTIONS = [
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'others', label: 'Others' }
];

// 业务线第一层选项
export const BUSINESS_LINE_FIRST = [
  { value: 'A', label: 'A' },
  { value: 'P', label: 'P' },
  { value: 'M', label: 'M' },
  { value: 'I', label: 'I' }
];

// 业务线第二层选项 (00~07)
export const BUSINESS_LINE_SECOND = Array.from({ length: 8 }, (_, i) => ({
  value: String(i).padStart(2, '0'),
  label: String(i).padStart(2, '0')
}));

// 优先级数值映射（用于排序）
export const PRIORITY_MAP = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0
};
