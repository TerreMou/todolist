# Jo's TodoList - AI Coding Guidelines

## Project Overview
Jo's TodoList 是一个现代化的 Vue 3 任务管理应用，采用 **Composable 架构** 进行完全模块化设计。支持项目管理、任务分类、优先级排序、回收站、数据导入导出、看板/清单视图切换等功能。系统采用软删除机制，自动清理 30 天前的已删除项目。

### 核心功能
- ✅ **双视图模式**：看板视图（按项目分组）+ 清单视图（扁平展示）
- ✅ **任务管理**：创建、编辑、完成、删除、恢复、永久删除
- ✅ **项目管理**：创建项目、关联任务、状态变更（未开始→进行中→已完成）
- ✅ **过滤与搜索**：全文搜索、多类别过滤、完成状态过滤
- ✅ **优先级排序**：紧急任务自动置顶并高亮（3天内截止的任务）
- ✅ **回收站**：支持软删除和恢复，30天自动清理
- ✅ **数据持久化**：本地 localStorage 存储，支持 JSON 导入导出备份

## Architecture Patterns

### 项目结构
```
src/
├── App.vue                    # 主应用入口（包含完整UI逻辑）
├── main.js                   # Vue 初始化
├── constants.js              # 集中配置常量
├── style.css                 # 全局样式
├── utils/
│   ├── dateTime.js          # 日期时间工具（日期提取、组合、格式化）
│   └── validators.js        # 验证和业务工具（优先级、状态转换等）
├── composables/
│   ├── useNotification.js    # 通知系统管理（自动隐藏）
│   ├── useStorage.js         # 本地存储和导入导出
│   ├── useTasks.js          # 任务完整业务逻辑
│   └── useProjects.js       # 项目完整业务逻辑
├── components/
│   ├── EnhancedDatePicker.vue # 增强日期选择器
│   └── ui/                    # shadcn/ui Reka 组件库
├── api/ services/ assets/     # 保留用于扩展
└── lib/utils.js              # 通用工具
```

### 核心设计原则
1. **Composables 为核心** - 所有业务逻辑（CRUD、排序、验证）都以 composable 形式提取
2. **常量集中管理** - `constants.js` 存储所有魔法数字、配置项、样式映射
3. **工具函数模块化** - 按功能域分离（日期/时间、验证、业务逻辑）
4. **单一职责原则** - 每个 composable 和工具负责一个清晰的功能域
5. **响应式数据** - 使用 Vue ref 和 computed 管理所有状态变化
6. **本地存储优先** - 所有数据通过 localStorage 持久化，自动加载和保存
7. **软删除策略** - isDeleted 标志位 + deletedAt 时间戳，支持 30 天自动清理

## Key Constants & Configurations

### constants.js
所有常量在此集中定义，确保单一来源真实性：

```javascript
// 存储键和持久化配置
STORAGE_KEY = 'jos-todo-list-data'              // 任务存储键
STORAGE_KEY_PROJECTS = 'jos-todo-list-projects' // 项目存储键
TRASH_RETENTION_DAYS = 30                        // 回收站自动清理天数
NOTIFICATION_DURATION = 3000                     // 通知显示时长 (ms)
DEFAULT_TIME = '12:00'                          // 任务默认时间

// 分类选项（固定列表，用于过滤和分配）
CATEGORY_OPTIONS = ['MKT', 'Event', 'Payment', 'Others']

// 优先级样式映射（Tailwind 类）
PRIORITY_STYLES_CONFIG = {
  high: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  medium: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  none: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
}

// 项目状态选项
PROJECT_STATUS_OPTIONS = [
  { value: 'not_started', label: '未开始', color: 'bg-slate-100 text-slate-500' },
  { value: 'in_progress', label: '进行中', color: 'bg-blue-100 text-blue-600' },
  { value: 'completed', label: '已完成', color: 'bg-green-100 text-green-600' }
]

// 优先级权重（用于排序，数值越高优先级越高）
PRIORITY_MAP = { high: 3, medium: 2, low: 1, none: 0 }
```

## Composable API 文档

### useNotification()
全局通知系统，支持成功/错误提示，自动 3 秒隐藏

```javascript
const { notification, showNotification } = useNotification();

// notification: Ref<{ show: boolean, message: string, type: 'success'|'error' }>
// showNotification(msg: string, type: 'success'|'error' = 'success')
//   - 显示通知，3秒后自动隐藏
```

### useStorage()
本地存储管理和数据导入导出

```javascript
const {
  loadFromLocalStorage,  // 从 localStorage 加载任务和项目
  saveToLocalStorage,    // 保存任务和项目到 localStorage
  exportData,            // 导出为 JSON 文件
  importData             // 从 JSON 导入数据
} = useStorage();

// loadFromLocalStorage(): { tasks: [], projects: [] }
// saveToLocalStorage(tasks, projects): void
// exportData(tasks, projects, showNotification): void
// importData(data, tasksRef, projectsRef, showNotification): boolean
```

### useTasks(tasksRef, projectsRef, showNotification)
任务完整业务逻辑（CRUD、排序、验证、软删除）

```javascript
const {
  // 计算属性
  activeTasks,              // 未删除的任务
  trashTasks,               // 已删除的任务

  // 业务方法
  getSortedFilteredTasks,   // 排序和过滤（搜索+状态+分类）
  createTask,               // 创建任务
  updateTask,               // 更新任务
  toggleTaskStatus,         // 切换完成状态
  prepareTaskForEdit,       // 提取任务数据用于编辑表单
  softDeleteTask,           // 软删除（移至回收站）
  restoreTask,              // 恢复任务
  permanentDeleteTask,      // 永久删除
  emptyTaskTrash,           // 清空任务回收站
  getProjectTaskStats       // 获取项目任务统计 { total, completed, progress }
} = useTasks(tasksRef, projectsRef, showNotification);
```

### useProjects(projectsRef, tasksRef, showNotification)
项目完整业务逻辑（CRUD、状态管理、关联任务处理）

```javascript
const {
  // 计算属性
  activeProjects,              // 活跃项目
  trashProjects,               // 已删除项目
  completedProjectsList,       // 已完成项目

  // 业务方法
  selectableProjects,          // 获取可选项目（排除已完成，除非正在编辑）
  createProject,               // 创建项目
  updateProject,               // 更新项目
  updateProjectStatus,         // 更改项目状态
  unarchiveProject,            // 从已完成状态移回进行中
  getProjectTaskCount,         // 获取项目关联任务数
  softDeleteProject,           // 软删除项目
  restoreProject,              // 恢复项目和关联已删除任务
  confirmSoftDeleteProject,    // 确认软删除（处理关联任务）
  confirmPermanentDeleteProject,// 确认永久删除
  emptyProjectTrash            // 清空项目回收站
} = useProjects(projectsRef, tasksRef, showNotification);
```

## Utils 模块文档

### utils/dateTime.js
日期时间处理工具函数

```javascript
import {
  combineDateTime,          // 合并 CalendarDate + 时间字符串到 ISO
  formatDate,               // 格式化为 "MMM do HH:mm"（带本地化）
  formatSimpleDate,         // 格式化为 "yyyy/MM/dd"
  generateTimeOptions,      // 生成 30 分钟间隔的时间数组
  extractDateFromISO,       // 从 ISO 字符串提取 CalendarDate
  extractTimeFromISO        // 从 ISO 字符串提取时间 (HH:mm)
} from '@/utils/dateTime';

// combineDateTime(date: CalendarDate, time: string): string
//   - date: Reka UI CalendarDate 对象（有 .toString() 方法）
//   - time: "HH:mm" 格式的时间字符串
//   - 返回: ISO 8601 日期时间字符串

// formatDate(iso: string): string
//   - 格式化为 "Feb 16th 12:00"（中文本地化）

// formatSimpleDate(iso: string): string
//   - 格式化为 "2025/02/16"

// generateTimeOptions(): string[]
//   - 返回 ['00:00', '00:30', '01:00', ..., '23:30']

// extractDateFromISO(iso: string): CalendarDate | undefined
//   - 从 "2025-02-16T12:00:00.000Z" 提取日期部分

// extractTimeFromISO(iso: string): string
//   - 从 ISO 字符串提取 "12:00" 格式的时间
```

### utils/validators.js
验证和业务逻辑工具函数

```javascript
import {
  isUrgent,                 // 检查任务是否紧急（3天内截止）
  getPriorityStyles,        // 获取优先级 Tailwind 样式
  getProjectStatusStyle,    // 获取项目状态样式
  getProjectStatusLabel,    // 获取项目状态标签
  validateTaskTitle,        // 验证任务标题非空
  validateDueDate,          // 验证截止日期有效性
  validateProjectTitle,     // 验证项目标题非空
  getPriorityWeight,        // 获取优先级权重（用于排序）
  sortAndFilterTasks        // 综合排序和过滤任务
} from '@/utils/validators';

// isUrgent(task: Task): boolean
//   - 检查任务是否在3天内截止（且未完成）

// getPriorityStyles(priority: string): string
//   - 返回优先级对应的 Tailwind CSS 类字符串

// getProjectStatusStyle(status: string): string
//   - 返回项目状态对应的样式类

// getProjectStatusLabel(status: string): string
//   - 返回项目状态的中文标签文本

// validateTaskTitle(title: string, showNotification: Function): boolean
//   - 验证标题非空，失败时自动显示通知

// validateDueDate(dueDate: string, isEditing: boolean, showNotification: Function): boolean
//   - 验证截止日期不能是过去时间（创建模式），编辑模式允许过去时间

// validateProjectTitle(title: string, showNotification: Function): boolean
//   - 验证项目名称非空

// getPriorityWeight(priority: string): number
//   - 返回 { high: 3, medium: 2, low: 1, none: 0 }

// sortAndFilterTasks(tasks: Task[], searchQuery: string, filterStatus: string, filterCategories: string[]): Task[]
//   - 执行搜索 (title + desc)
//   - 状态过滤 (all/active/completed)
//   - 分类过滤 (多选)
//   - 排序: 完成→未完成 | 紧急优先 | 按优先级 | 按截止日期
```

## Data Structures

### Task 对象（完整 Schema）
```javascript
{
  id: number,                              // 唯一标识 (Date.now())
  title: string,                           // 任务标题（必填）
  desc: string,                            // 任务描述（可选）
  priority: 'high'|'medium'|'low'|'none', // 优先级
  dueDate: string,                         // 截止时间（ISO 8601 格式）
  categories: string[],                    // 分类数组（从 CATEGORY_OPTIONS 中选择）
  projectId: number | null,                // 所属项目 ID（null = 未归档）
  completed: boolean,                      // 完成状态
  isDeleted: boolean,                      // 软删除标志
  deletedAt: string | null,                // 删除时间戳（ISO 8601 格式）
  createdAt: string                        // 创建时间戳（ISO 8601 格式）
}
```

### Project 对象（完整 Schema）
```javascript
{
  id: number,                                     // 唯一标识 (Date.now())
  title: string,                                  // 项目名称（必填）
  desc: string,                                   // 项目描述（可选）
  status: 'not_started'|'in_progress'|'completed', // 项目状态
  startDate: string | null,                       // 开始日期（日期字符串，非ISO）
  endDate: string | null,                         // 结束日期（日期字符串，非ISO）
  isDeleted: boolean,                             // 软删除标志
  deletedAt: string | null,                       // 删除时间戳（ISO 8601 格式）
  createdAt: string                               // 创建时间戳（ISO 8601 格式）
}
```

## Filtering & Sorting Behavior

### 搜索过滤流程
1. **全文搜索** - 在任务标题和描述中搜索（不区分大小写）
2. **状态过滤** - all（全部）/ active（待办）/ completed（已完成）
3. **分类过滤** - 多选分类（任务只要匹配一个分类即显示）
4. **排序规则**（优先级从高到低）：
   - 完成状态：已完成的任务放在最后
   - 紧急标记：3 天内截止（且未完成）的任务置顶，并高亮 + 摇晃动画
   - 优先级排序：high → medium → low → none
   - 截止时间：按时间早到晚排序

### 看板视图分组
- **未归档任务** - `projectId` 为 null 或 'none' 的任务
- **活跃项目** - 状态不为 'completed' 的所有项目，每个项目单独显示一列
- **已完成项目** - 在主菜单中的独立视图（不在看板中显示）

### 进度条计算
```javascript
progress = (completedTaskCount / totalTaskCount) * 100
// 仅统计项目下的未删除、未完成的任务
```

## App.vue 主要状态和操作

### 核心 State
```javascript
// 数据
const tasks = ref([]);              // 所有任务
const projects = ref([]);           // 所有项目
const editingId = ref(null);        // 正在编辑的任务 ID

// 表单
const form = ref({                  // 任务表单
  title: '',
  desc: '',
  priority: 'low',
  date: undefined,                  // CalendarDate 对象
  time: DEFAULT_TIME,               // 'HH:mm' 格式
  categories: [],
  projectId: 'none'
});

const projectForm = ref({           // 项目表单
  id: null,
  title: '',
  desc: '',
  status: 'not_started',
  startDate: undefined,             // CalendarDate 对象
  endDate: undefined                // CalendarDate 对象
});

// 过滤和显示
const searchQuery = ref('');        // 搜索关键词
const filterStatus = ref('all');    // 状态过滤
const filterCategories = ref([]);   // 分类过滤
const viewMode = ref('project');    // 'project' 或 'list'

// 模态框
const showTaskModal = ref(false);
const showProjectModal = ref(false);
const showTrashModal = ref(false);
const showCompletedModal = ref(false);
const showDeleteConfirmModal = ref(false);
```

### 关键 Computed Properties
```javascript
// 统计信息
const stats = computed(() => ({
  total: activeTasks.value.length,
  completed: activeTasks.value.filter(t => t.completed).length,
  progress: (completed / total) * 100 || 0
}));

// 看板视图分组数据
const groupedTasks = computed(() => {
  // 返回按项目分组的任务，支持搜索时过滤空分组
});

// 清单视图扁平数据
const flatFilteredTasks = computed(() => {
  // 返回排序和过滤后的任务数组
});

// 可选项目列表
const selectableProjectsList = computed(() => {
  // 排除已完成项目，除非正在编辑该项目
});
```

### 关键事件处理
```javascript
// 任务操作
handleTaskSubmit()           // 创建或更新任务
editTaskForm(task)           // 进入编辑模式
openCreateTask(projectId)    // 打开创建任务对话框
handleSoftDeleteTask(id)     // 软删除任务
handleRestoreTask(id)        // 恢复任务
handlePermanentDeleteTask(id) // 永久删除任务

// 项目操作
handleProjectSubmit()        // 创建或更新项目
editProjectForm(proj)        // 进入编辑模式
handleDeleteProject(id)      // 删除项目（可能需要确认）
handlePermanentDeleteProject(id) // 永久删除项目

// 过滤操作
toggleFilterCategory(cat)    // 切换分类过滤
removeFilterCategory(cat)    // 移除单个分类
handleCategoryChange(cat, isChecked) // 更新任务分类

// 数据操作
handleExportData()           // 导出数据为 JSON
handleImport(event)          // 导入数据
triggerImport()              // 触发文件选择
```

## 常见模式与实现

### 表单提交流程
```javascript
// 1. 验证 - 使用 validators.js 工具函数
if (!validateTaskTitle(title, showNotification)) return;
if (!validateDueDate(dueDate, isEditing, showNotification)) return;

// 2. 组合数据 - 日期和时间合并为 ISO
const finalDueDate = combineDateTime(form.value.date, form.value.time);

// 3. 创建或更新
if (editingId.value) {
  updateTask(editingId.value, ...args);
} else {
  createTask(...args);
}

// 4. 重置表单和关闭对话框
resetForm();
showTaskModal.value = false;
```

### 任务卡片状态显示
- **已完成** - `opacity-50 bg-muted/20 border-transparent` + 文本 line-through
- **紧急** - `border-amber-500/50 bg-amber-50/10` + animate-shake 动画
- **悬停** - 显示编辑和删除按钮

### 分类处理
```javascript
// 始终检查 categories 是否为数组（向后兼容）
const safeCategories = Array.isArray(task.categories) ? [...task.categories] : [];

// 切换分类
if (isChecked) {
  if (!form.value.categories.includes(cat)) {
    form.value.categories.push(cat);
  }
} else {
  form.value.categories = form.value.categories.filter(item => item !== cat);
}
```

### 日期时间处理
```javascript
// 创建/编辑时
const date = extractDateFromISO(task.dueDate);        // CalendarDate 对象
const time = extractTimeFromISO(task.dueDate);        // 'HH:mm' 字符串

// 提交时
const isoString = combineDateTime(form.value.date, form.value.time);  // ISO 字符串

// 显示时
const formatted = formatDate(task.dueDate);          // "Feb 16th 12:00"
const simple = formatSimpleDate(task.dueDate);       // "2025/02/16"
```

### 项目删除处理
```javascript
// 检查是否有关联任务
const hasTasks = getProjectTaskCount(projectId, false) > 0;

if (hasTasks) {
  // 弹出确认对话框：删除项目及任务 OR 仅删除项目（任务解绑）
  showDeleteConfirmModal = true;
} else {
  // 直接删除
  softDeleteProject(projectId);
}
```

### 通知系统
```javascript
// 成功通知（默认）
showNotification('操作成功');

// 错误通知
showNotification('验证失败', 'error');

// 自动隐藏（3秒）
```

### 回收站自动清理
```javascript
// 在 useStorage.loadFromLocalStorage() 中自动执行
const thirtyDaysAgo = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
tasks = tasks.filter(
  t => !t.isDeleted || (t.isDeleted && new Date(t.deletedAt).getTime() > thirtyDaysAgo)
);
```

## 开发工作流

### 启动项目
```bash
npm run dev      # Vite 热重载开发服务器
npm run build    # 生产构建（输出到 dist/）
npm run preview  # 本地预览构建结果
```

### 依赖包版本
- vue: ^3.5.24
- reka-ui: 2.6.1 (Reka UI 组件库)
- date-fns: 4.1.0 (日期处理)
- tailwindcss: 3.4.18 (CSS 框架)
- lucide-vue-next: 0.556.0 (图标库)
- vite: ^7.2.4 (构建工具)

### 添加 UI 组件
1. 从 shadcn/ui 文档复制组件代码
2. 放在 `src/components/ui/{name}/` 下
3. 在 `src/components/ui/{name}/index.js` 导出
4. 在 App.vue 中导入使用

## 关键注意事项

### 日期处理坑
- Reka UI Calendar 的 `v-model` 返回 **CalendarDate 对象**（带 `.toString()` 方法），不是原生 Date
- 合并日期和时间时，**必须使用** `combineDateTime()` 以避免时区问题
- 编辑表单时，使用 `extractDateFromISO()` 和 `extractTimeFromISO()` 反序列化

### 分类数组安全
- **始终检查** `Array.isArray(t.categories)`，因为旧数据可能是 undefined
- 创建任务时确保转换为空数组：`const safeCategories = Array.isArray(categories) ? [...categories] : [];`

### 软删除清理
- 自动在 `useStorage.loadFromLocalStorage()` 运行（项目启动时）
- 删除 30 天前的已删除项目
- 计算方式：`thirtyDaysAgo = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000`

### 表单重置
- **必须显式调用** `resetForm()` 和 `resetProjectForm()`，否则字段（包括 categories）不会清空
- 在提交后和取消时都要重置

### 优先级排序
- `PRIORITY_MAP = { high: 3, medium: 2, low: 1, none: 0 }`
- 排序时使用 **降序**（数值越大优先级越高）

### 项目状态转换
- `not_started` → `in_progress` → `completed`
- 已完成项目会自动从看板中隐藏，可在"已完成项目"菜单中恢复
- 恢复已完成项目时调用 `unarchiveProject()`

### 项目删除策略
- 删除项目时检查是否有关联任务：`getProjectTaskCount(projectId, false) > 0`
- 关联任务处理方案二选一：
  1. **删除任务**：`confirmSoftDeleteProject(projectId, true)` → 任务移至回收站
  2. **解绑任务**：`confirmSoftDeleteProject(projectId, false)` → 任务移至未归档

### 紧急任务判定
- 仅当 `dueDate` 在 **3 天内**（且未完成）时标记为紧急
- 显示高亮样式 + **animate-shake** 动画
- 排序时置顶展示

## 开发技巧

### 调试小提示
- 在浏览器 DevTools 中检查 localStorage：`localStorage.getItem('jos-todo-list-data')`
- 查看所有项目：`localStorage.getItem('jos-todo-list-projects')`
- 手动清除数据：`localStorage.clear()`

### 动画类定义
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}

.animate-shake {
  animation: shake 0.6s cubic-bezier(.36, .07, .19, .97) both;
}
```

### Vue 过渡动画
```vue
<TransitionGroup name="list">
  <!-- 列表项会自动应用动画 -->
</TransitionGroup>

<!-- CSS -->
.list-enter-active, .list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from, .list-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
```

### 自定义滚动条样式
```css
.custom-scroll {
  scrollbar-width: thin;
  scrollbar-color: #d4d4d8 transparent;
}

.custom-scroll::-webkit-scrollbar {
  width: 6px;
  height: 8px;
}

.custom-scroll::-webkit-scrollbar-thumb {
  background-color: #d4d4d8;
  border-radius: 9999px;
}
```</content>
<parameter name="filePath">/Users/terremou/Desktop/todolist-main/.github/copilot-instructions.md