# Jo's TodoList - AI Coding Guidelines

## Project Overview
Jo's TodoList 是一个现代化的 Vue 3 任务管理应用，采用 **Composable 架构** 进行模块化设计。支持项目管理、任务分类、优先级排序、回收站、导入导出等功能。

## Architecture Patterns

### 项目结构 (v2.0+ 重构版)
```
src/
├── App.vue                 # 主应用入口（UI 逻辑）
├── main.js                # Vue 初始化
├── constants.js           # 常量配置（新）
├── utils/
│   ├── dateTime.js       # 日期时间工具函数（新）
│   └── validators.js     # 验证和业务逻辑工具（新）
├── composables/
│   ├── useNotification.js    # 通知管理（新）
│   ├── useStorage.js         # 本地存储操作（新）
│   ├── useTasks.js          # 任务业务逻辑（新）
│   └── useProjects.js       # 项目业务逻辑（新）
├── components/
│   ├── JoLogo.vue
│   ├── EnhancedDatePicker.vue
│   └── ui/                # shadcn/ui 组件
```

### 核心设计原则
1. **Composables** - 提取可复用的业务逻辑和状态管理
2. **常量集中** - 所有魔法数字和配置在 `constants.js`
3. **工具函数模块化** - 按功能分离（日期、验证、业务逻辑）
4. **单一职责** - 每个 composable/工具负责一个明确的功能域
5. **类型安全** - 遵循一致的数据结构规范

## Key Constants & Configurations

### constants.js
```javascript
// 存储键和时间配置
STORAGE_KEY: 'jos-todo-list-data'
STORAGE_KEY_PROJECTS: 'jos-todo-list-projects'
TRASH_RETENTION_DAYS: 30              // 回收站自动清理天数
NOTIFICATION_DURATION: 3000           // 通知显示时长 (ms)
DEFAULT_TIME: '12:00'                // 任务默认时间

// 分类选项（固定列表）
CATEGORY_OPTIONS: ['MKT', 'Event', 'Payment', 'Others']

// 优先级样式映射
PRIORITY_STYLES_CONFIG: {
  high: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  medium: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  none: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
}

// 项目状态选项
PROJECT_STATUS_OPTIONS: [
  { value: 'not_started', label: '未开始', color: 'bg-slate-100 text-slate-500' },
  { value: 'in_progress', label: '进行中', color: 'bg-blue-100 text-blue-600' },
  { value: 'completed', label: '已完成', color: 'bg-green-100 text-green-600' }
]

// 优先级权重（用于排序）
PRIORITY_MAP: { high: 3, medium: 2, low: 1, none: 0 }
```

## Composable API 文档

### useNotification()
管理全局通知弹窗
```javascript
const { notification, showNotification } = useNotification();

// notification: { show: boolean, message: string, type: 'success' | 'error' }
// showNotification(msg, type = 'success') - 显示3秒后自动隐藏
```

### useStorage()
本地存储和数据导入导出
```javascript
const { loadFromLocalStorage, saveToLocalStorage, exportData, importData } = useStorage();

// loadFromLocalStorage() - 返回 { tasks, projects }
// saveToLocalStorage(tasks, projects) - 保存到 localStorage
// exportData(tasks, projects, showNotification) - 导出为 JSON 文件
// importData(data, tasksRef, projectsRef, showNotification) - 导入数据
```

### useTasks(tasksRef, projectsRef, showNotification)
任务业务逻辑管理
```javascript
const {
  activeTasks,              // 计算属性：未删除的任务
  trashTasks,               // 计算属性：已删除的任务
  getSortedFilteredTasks,   // 排序和过滤任务
  createTask,               // 创建任务
  updateTask,               // 更新任务
  toggleTaskStatus,         // 切换任务完成状态
  prepareTaskForEdit,       // 提取任务数据用于编辑表单
  softDeleteTask,           // 软删除（移至回收站）
  restoreTask,              // 恢复任务
  permanentDeleteTask,      // 永久删除
  emptyTaskTrash,           // 清空任务回收站
  getProjectTaskStats       // 获取项目任务统计
} = useTasks(tasksRef, projectsRef, showNotification);
```

### useProjects(projectsRef, tasksRef, showNotification)
项目业务逻辑管理
```javascript
const {
  activeProjects,              // 计算属性：活跃项目
  trashProjects,               // 计算属性：已删除项目
  completedProjectsList,       // 计算属性：已完成项目
  selectableProjects,          // 获取可选项目（排除已完成）
  createProject,               // 创建项目
  updateProject,               // 更新项目
  updateProjectStatus,         // 更新项目状态
  unarchiveProject,            // 从已完成状态移回进行中
  getProjectTaskCount,         // 获取项目任务数
  softDeleteProject,           // 软删除项目
  restoreProject,              // 恢复项目和关联任务
  confirmSoftDeleteProject,    // 确认软删除（处理关联任务）
  confirmPermanentDeleteProject,// 确认永久删除
  emptyProjectTrash            // 清空项目回收站
} = useProjects(projectsRef, tasksRef, showNotification);
```

## Utils 模块文档

### utils/dateTime.js
```javascript
import { combineDateTime, formatDate, formatSimpleDate, generateTimeOptions,
         extractDateFromISO, extractTimeFromISO } from '@/utils/dateTime';

// combineDateTime(date, time) - 合并 CalendarDate + 时间字符串到 ISO
// formatDate(iso) - 格式化为 "MMM do HH:mm"（带本地化）
// formatSimpleDate(iso) - 格式化为 "yyyy/MM/dd"
// generateTimeOptions() - 生成 30 分钟间隔的时间数组
// extractDateFromISO(iso) - 从 ISO 字符串提取日期
// extractTimeFromISO(iso) - 从 ISO 字符串提取时间 (HH:mm)
```

### utils/validators.js
```javascript
import { isUrgent, getPriorityStyles, getProjectStatusStyle, getProjectStatusLabel,
         validateTaskTitle, validateDueDate, validateProjectTitle,
         getPriorityWeight, sortAndFilterTasks } from '@/utils/validators';

// isUrgent(task) - 检查任务是否紧急（3天内截止）
// getPriorityStyles(priority) - 获取优先级 Tailwind 样式
// getProjectStatusStyle(status) - 获取项目状态样式
// getProjectStatusLabel(status) - 获取项目状态标签
// validateTaskTitle(title, showNotification) - 验证任务标题
// validateDueDate(dueDate, isEditing, showNotification) - 验证截止日期
// validateProjectTitle(title, showNotification) - 验证项目标题
// getPriorityWeight(priority) - 获取优先级权重（用于排序）
// sortAndFilterTasks(tasks, searchQuery, filterStatus, filterCategories) - 排序和过滤
```

## Utility Functions (Extracted for Reusability)
- `combineDateTime(date, time)` - 合并 CalendarDate 和时间字符串为 ISO 格式
- `extractDateFromISO(isoString)` - 从 ISO 日期提取 CalendarDate 对象
- `extractTimeFromISO(isoString)` - 从 ISO 日期提取 HH:mm 时间格式
- `formatDate(iso)` - 格式化 ISO 日期为显示文本（带时间）
- `formatSimpleDate(iso)` - 格式化 ISO 日期为简单格式 (YYYY/MM/DD)
- `generateTimeOptions()` - 生成 30 分钟间隔的时间选项数组
- `isUrgent(task)` - 检查任务是否紧急（3 天内截止）
- `getPriorityStyles(priority)` - 返回优先级对应的 Tailwind 类字符串
- `getProjectStatusStyle(status)` - 返回项目状态对应的样式类
- `getProjectStatusLabel(status)` - 返回项目状态标签文本
- `validateTaskTitle(title, showNotification)` - 验证任务标题
- `validateDueDate(dueDate, isEditing, showNotification)` - 验证截止日期
- `validateProjectTitle(title, showNotification)` - 验证项目标题
- `sortAndFilterTasks(tasks, searchQuery, filterStatus, filterCategories)` - 综合排序和过滤任务

## Data Structures
```javascript
// Task object (complete schema)
{
  id: Date.now(),                    // Unique ID
  title: string,                     // Required, displays as badge if ≤20 chars
  desc: string,                      // Optional description (line-clamp-2 in UI)
  priority: 'high'|'medium'|'low'|'none',
  dueDate: ISO8601 string,           // Combined date+time
  categories: string[],              // Multi-select from CATEGORY_OPTIONS
  completed: boolean,                // Toggle via click checkbox
  isDeleted: boolean,                // Soft delete flag
  deletedAt: ISO8601 string,         // Timestamp of deletion
  createdAt: ISO8601 string
}
```

## Filtering & Sorting Behavior
1. **Search** - Full-text on title + desc (case-insensitive)
2. **Status filter** - all/active/completed
3. **Category filter** - Multi-select with Command palette
4. **Sort order** (when filtered):
   - Completed tasks last
   - Urgent tasks (≤3 days) first, with amber highlight + shake animation
   - Then by priority: high → medium → low → none
   - Finally by due date ascending

## Common Patterns & Implementation
- **Task card states**: `completed` → opacity-50 + line-through, `urgent` → amber border + shake
- **Form submission**: Validate title → validate dueDate → create/update → reset form → notify
- **Category handling**: Always check `Array.isArray(t.categories)` for backward compatibility
- **Date handling**: Use `combineDateTime()` for form submission, `extractDateFromISO()` for editing
- **Notifications**: Call `showNotification()` after operations with auto-hide after 3s
- **Transitions**: Vue `<TransitionGroup>` for list animations (350ms ease), slide-up for toasts

## Development Workflow
- **Start dev server**: `npm run dev` (Vite with hot reload)
- **Build**: `npm run build` (outputs to `dist/`, validates with Vite + Vue compiler)
- **Preview**: `npm run preview` (serve built files locally)
- **Add UI component**: Copy from shadcn/ui docs, place in `src/components/ui/{name}/`, export in `index.js`

## Critical Gotchas
- **Date parsing**: Reka UI Calendar's `v-model` returns CalendarDate objects (has `.toString()` method), NOT native Date
- **ISO format**: When combining date + time, use `combineDateTime()` to avoid timezone issues
- **Category array safety**: Always check `Array.isArray(t.categories)` - older tasks may have undefined
- **Trash cleanup**: Automatically runs on `onMounted()` - deletes items older than 30 days
- **Form reset**: Must call `resetForm()` explicitly after submit to clear all fields including categories
- **Priority ordering**: `priorityMap = { high: 3, medium: 2, low: 1, none: 0 }` - sort DESC (higher number first)
- **Duplicate function names**: When refactoring, ensure functions aren't declared twice (check tool functions section)</content>
<parameter name="filePath">/Users/terremou/Desktop/todolist-main/.github/copilot-instructions.md