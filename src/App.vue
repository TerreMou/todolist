<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import {
  Trash2, Plus, Calendar as CalendarIcon, CheckCircle2, Circle, Search,
  LayoutDashboard, PenSquare, Clock, AlertTriangle, AlertCircle, PieChart,
  ListFilter, X, Check, Filter, FolderPlus, Folder, LayoutList, Grip,
  ArchiveRestore, FolderOpen, Kanban, Settings2, MoreHorizontal, Eraser,
  Download, Upload, FileJson, HardDrive, Eye, EyeOff
} from 'lucide-vue-next';
import { format, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { parseDate, today, getLocalTimeZone, CalendarDate } from '@internationalized/date';

// 引入 Shadcn 组件
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import JoLogo from '@/components/JoLogo.vue';
import EnhancedDatePicker from '@/components/EnhancedDatePicker.vue';

// --- 常量定义 ---
const STORAGE_KEY = 'jos-todo-list-data';
const STORAGE_KEY_PROJECTS = 'jos-todo-list-projects';
const CATEGORY_OPTIONS = ['MKT', 'Event', 'Payment', 'Others'];
const TRASH_RETENTION_DAYS = 30;
const NOTIFICATION_DURATION = 3000;
const DEFAULT_TIME = '12:00';

const PRIORITY_STYLES_CONFIG = {
  high: 'border-red-500/30 bg-red-100 text-red-700 hover:bg-red-200',
  medium: 'border-orange-500/30 bg-orange-100 text-orange-700 hover:bg-orange-200',
  low: 'border-blue-500/30 bg-blue-100 text-blue-700 hover:bg-blue-200',
  none: 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
};

const PROJECT_STATUS_OPTIONS = [
  { value: 'not_started', label: '未开始', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'in_progress', label: '进行中', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'completed', label: '已完成', color: 'bg-green-50 text-green-600 border-green-200' }
];

// --- 状态定义 ---
const tasks = ref([]);
const projects = ref([]);
const editingId = ref(null);

// 弹窗控制状态
const showTrashModal = ref(false);
const showProjectModal = ref(false);
const showTaskModal = ref(false);

const trashViewMode = ref('tasks');

// 任务表单
const form = ref({
  title: '',
  desc: '',
  priority: 'low',
  date: undefined,
  time: DEFAULT_TIME,
  categories: [],
  projectId: 'none'
});

// 项目表单
const projectForm = ref({
  id: null,
  title: '',
  desc: '',
  status: 'not_started',
  startDate: undefined,
  endDate: undefined
});

const searchQuery = ref('');
const filterStatus = ref('all');
const filterCategories = ref([]);
const viewMode = ref('project');
// 🟢 新增：是否显示已完成项目
const showCompletedProjects = ref(false);

const notification = ref({ show: false, message: '', type: 'success' });
const fileInput = ref(null);

// --- 工具函数 ---

const combineDateTime = () => {
  if (!form.value.date) return '';
  const dateStr = form.value.date.toString();
  const date = new Date(dateStr);
  const [hours, minutes] = form.value.time.split(':');
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toISOString();
};

const extractTimeFromISO = (isoString) => {
  const dateObj = new Date(isoString);
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const extractDateFromISO = (isoString) => {
  try {
    const isoDateStr = isoString.split('T')[0];
    return parseDate(isoDateStr);
  } catch (e) {
    return undefined;
  }
};

const formatDate = (iso) => iso ? format(new Date(iso), 'MMM do HH:mm', { locale: zhCN }) : '';
const formatSimpleDate = (iso) => iso ? format(new Date(iso), 'yyyy/MM/dd', { locale: zhCN }) : '-';

const isUrgent = (task) => {
  if (task.completed || !task.dueDate) return false;
  const due = new Date(task.dueDate);
  const now = new Date();
  const diff = differenceInDays(due, now);
  return due > now && diff <= 3 && diff >= -1;
};

const getPriorityStyles = (priority) => PRIORITY_STYLES_CONFIG[priority] || PRIORITY_STYLES_CONFIG.none;

const getProjectStatusStyle = (status) => {
  const s = PROJECT_STATUS_OPTIONS.find(opt => opt.value === status);
  return s ? s.color : PROJECT_STATUS_OPTIONS[0].color;
};
const getProjectStatusLabel = (status) => {
  const s = PROJECT_STATUS_OPTIONS.find(opt => opt.value === status);
  return s ? s.label : '未开始';
};

const validateTaskTitle = (title) => {
  if (!title.trim()) {
    showNotification('请输入任务标题', 'error');
    return false;
  }
  return true;
};

const validateDueDate = (dueDate, isEditing) => {
  if (dueDate && new Date(dueDate) < new Date() && !isEditing) {
    showNotification('截止时间无效', 'error');
    return false;
  }
  return true;
};

const showNotification = (msg, type = 'success') => {
  notification.value = { show: true, message: msg, type };
  setTimeout(() => notification.value.show = false, NOTIFICATION_DURATION);
};

// --- 核心逻辑 ---

const saveToLocalStorage = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.value));
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects.value));
};

onMounted(() => {
  const savedTasks = localStorage.getItem(STORAGE_KEY);
  if (savedTasks) {
    try {
      const parsed = JSON.parse(savedTasks);
      tasks.value = parsed.map(t => ({
        ...t,
        categories: Array.isArray(t.categories) ? t.categories : [],
        projectId: t.projectId || null
      }));
    } catch (e) { tasks.value = []; }
  }

  const savedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
  if (savedProjects) {
    try {
      const parsed = JSON.parse(savedProjects);
      projects.value = parsed.map(p => ({ ...p, status: p.status || 'not_started' }));
    } catch (e) { projects.value = []; }
  }

  const thirtyDaysAgo = Date.now() - (TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  tasks.value = tasks.value.filter(t => !t.isDeleted || (t.isDeleted && new Date(t.deletedAt).getTime() > thirtyDaysAgo));
  projects.value = projects.value.filter(p => !p.isDeleted || (p.isDeleted && new Date(p.deletedAt).getTime() > thirtyDaysAgo));
});

watch([tasks, projects], saveToLocalStorage, { deep: true });

const exportData = () => {
  const data = {
    tasks: tasks.value,
    projects: projects.value,
    version: '1.1',
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

const triggerImport = () => {
  fileInput.value?.click();
};

const handleImport = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (Array.isArray(parsed.tasks) && Array.isArray(parsed.projects)) {
        tasks.value = parsed.tasks;
        projects.value = parsed.projects;
        saveToLocalStorage();
        showNotification('数据恢复成功！');
      } else {
        throw new Error('格式无效');
      }
    } catch (err) {
      console.error(err);
      showNotification('导入失败：文件格式错误', 'error');
    } finally {
      event.target.value = ''; // 重置 input
    }
  };
  reader.readAsText(file);
};

const activeTasks = computed(() => tasks.value.filter(t => !t.isDeleted));
const activeProjects = computed(() => projects.value.filter(p => !p.isDeleted));
const trashTasks = computed(() => tasks.value.filter(t => t.isDeleted));
const trashProjects = computed(() => projects.value.filter(p => p.isDeleted));

const stats = computed(() => {
  const total = activeTasks.value.length;
  const completed = activeTasks.value.filter(t => t.completed).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, progress };
});

const getSortedFilteredTasks = (sourceTasks) => {
  let result = sourceTasks;

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(t => t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query));
  }

  if (filterStatus.value === 'active') result = result.filter(t => !t.completed);
  else if (filterStatus.value === 'completed') result = result.filter(t => t.completed);

  if (filterCategories.value.length > 0) {
    result = result.filter(t => t.categories && t.categories.some(c => filterCategories.value.includes(c)));
  }

  return result.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.completed && !b.completed) {
      const urgentA = isUrgent(a);
      const urgentB = isUrgent(b);
      if (urgentA !== urgentB) return urgentA ? -1 : 1;
    }
    const priorityMap = { high: 3, medium: 2, low: 1, none: 0 };
    if (priorityMap[a.priority] !== priorityMap[b.priority]) return priorityMap[b.priority] - priorityMap[a.priority];
    return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
  });
};

const flatFilteredTasks = computed(() => getSortedFilteredTasks(activeTasks.value));

const groupedTasks = computed(() => {
  const groups = [];
  const filteredTasks = getSortedFilteredTasks(activeTasks.value);

  // 1. 未归档任务
  const inboxTasks = filteredTasks.filter(t => !t.projectId || t.projectId === 'none');
  groups.push({
    type: 'inbox',
    data: { id: 'none', title: '📂 未归档任务', desc: '不属于任何特定项目的独立任务', status: 'active' },
    tasks: inboxTasks,
    progress: 0
  });

  // 2. 活跃项目
  activeProjects.value.forEach(proj => {
    // 🟢 归档过滤：如果不显示已完成项目，且当前项目是已完成，则跳过
    if (!showCompletedProjects.value && proj.status === 'completed') {
      return;
    }

    const projTasks = filteredTasks.filter(t => t.projectId === proj.id);
    const allProjTasks = activeTasks.value.filter(t => t.projectId === proj.id);
    const completedCount = allProjTasks.filter(t => t.completed).length;
    const progress = allProjTasks.length === 0 ? 0 : Math.round((completedCount / allProjTasks.length) * 100);

    groups.push({
      type: 'project',
      data: proj,
      tasks: projTasks,
      progress
    });
  });

  // 排序：为了让未归档任务始终在前面，我们不需要额外sort，因为push顺序已经决定了
  // 如果搜索，应用搜索逻辑
  if (!searchQuery.value.trim()) return groups;

  const query = searchQuery.value.toLowerCase();
  return groups.filter(g => {
    const hasMatchingTasks = g.tasks.length > 0;
    const isProjectMatch = g.data.title.toLowerCase().includes(query);
    return hasMatchingTasks || isProjectMatch;
  });
});

// --- 任务表单逻辑 ---

const openCreateTask = (projectId = 'none') => {
  resetForm();
  form.value.projectId = projectId;
  showTaskModal.value = true;
};

const handleSubmit = () => {
  if (!validateTaskTitle(form.value.title)) return;
  const finalDueDate = combineDateTime();
  if (!validateDueDate(finalDueDate, !!editingId.value)) return;

  const safeCategories = form.value.categories ? [...form.value.categories] : [];
  const safeProjectId = form.value.projectId === 'none' ? null : form.value.projectId;

  const taskData = {
    title: form.value.title,
    desc: form.value.desc,
    priority: form.value.priority,
    dueDate: finalDueDate,
    categories: safeCategories,
    projectId: safeProjectId
  };

  if (editingId.value) {
    const index = tasks.value.findIndex(t => t.id === editingId.value);
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...taskData };
      showNotification('任务已更新');
    }
    editingId.value = null;
  } else {
    tasks.value.push({
      id: Date.now(),
      ...taskData,
      completed: false,
      isDeleted: false,
      createdAt: new Date().toISOString()
    });
    showNotification('任务已创建');
  }

  showTaskModal.value = false;
  resetForm();
};

const editTask = (task) => {
  const dateObj = task.dueDate ? extractDateFromISO(task.dueDate) : undefined;
  const timeStr = task.dueDate ? extractTimeFromISO(task.dueDate) : DEFAULT_TIME;

  form.value = {
    title: task.title,
    desc: task.desc,
    priority: task.priority,
    date: dateObj,
    time: timeStr,
    categories: Array.isArray(task.categories) ? [...task.categories] : [],
    projectId: task.projectId || 'none'
  };
  editingId.value = task.id;
  showTaskModal.value = true;
};

// --- 项目管理逻辑 ---

const saveProject = () => {
  if (!projectForm.value.title.trim()) {
    showNotification('请输入项目名称', 'error');
    return;
  }

  const startStr = projectForm.value.startDate ? projectForm.value.startDate.toString() : null;
  const endStr = projectForm.value.endDate ? projectForm.value.endDate.toString() : null;

  if (projectForm.value.id) {
    const index = projects.value.findIndex(p => p.id === projectForm.value.id);
    if (index !== -1) {
      projects.value[index] = {
        ...projects.value[index],
        title: projectForm.value.title,
        desc: projectForm.value.desc,
        status: projectForm.value.status,
        startDate: startStr,
        endDate: endStr
      };
      showNotification('项目已更新');
    }
  } else {
    projects.value.push({
      id: Date.now(),
      title: projectForm.value.title,
      desc: projectForm.value.desc,
      status: projectForm.value.status || 'not_started',
      startDate: startStr,
      endDate: endStr,
      isDeleted: false,
      createdAt: new Date().toISOString()
    });
    showNotification('项目已创建');
  }

  projectForm.value = { id: null, title: '', desc: '', status: 'not_started', startDate: undefined, endDate: undefined };
  showProjectModal.value = false;
};

const openEditProjectModal = (proj) => {
  projectForm.value = {
    id: proj.id,
    title: proj.title,
    desc: proj.desc,
    status: proj.status || 'not_started',
    startDate: proj.startDate ? parseDate(proj.startDate) : undefined,
    endDate: proj.endDate ? parseDate(proj.endDate) : undefined,
  };
  showProjectModal.value = true;
};

const editProject = (proj) => {
  projectForm.value = {
    id: proj.id,
    title: proj.title,
    desc: proj.desc,
    status: proj.status || 'not_started',
    startDate: proj.startDate ? parseDate(proj.startDate) : undefined,
    endDate: proj.endDate ? parseDate(proj.endDate) : undefined,
  };
};

const softDeleteProject = (id) => {
  const proj = projects.value.find(p => p.id === id);
  if (proj) {
    proj.isDeleted = true;
    proj.deletedAt = new Date().toISOString();

    let count = 0;
    tasks.value.forEach(t => {
      if (t.projectId === id && !t.isDeleted) {
        t.isDeleted = true;
        t.deletedAt = new Date().toISOString();
        count++;
      }
    });
    showNotification(`项目及 ${count} 个任务已移至回收站`);
  }
};

const restoreProject = (id) => {
  const proj = projects.value.find(p => p.id === id);
  if (proj) {
    proj.isDeleted = false;
    proj.deletedAt = null;

    let count = 0;
    tasks.value.forEach(t => {
      if (t.projectId === id && t.isDeleted) {
        t.isDeleted = false;
        t.deletedAt = null;
        count++;
      }
    });
    showNotification(`项目及 ${count} 个任务已恢复`);
  }
};

const permanentDeleteProject = (id) => {
  projects.value = projects.value.filter(p => p.id !== id);
  tasks.value.forEach(t => {
    if (t.projectId === id) t.projectId = null;
  });
  showNotification('项目已永久删除');
};

// --- 其他逻辑 ---

const handleCategoryChange = (cat, isChecked) => {
  if (!Array.isArray(form.value.categories)) form.value.categories = [];
  let newCategories = [...form.value.categories];
  if (isChecked) {
    if (!newCategories.includes(cat)) newCategories.push(cat);
  } else {
    newCategories = newCategories.filter(item => item !== cat);
  }
  form.value.categories = newCategories;
};

const toggleFilterCategory = (cat) => {
  const index = filterCategories.value.indexOf(cat);
  if (index === -1) filterCategories.value.push(cat);
  else filterCategories.value.splice(index, 1);
};

const removeFilterCategory = (cat) => {
  filterCategories.value = filterCategories.value.filter(c => c !== cat);
};

const softDelete = (id) => {
  const task = tasks.value.find(t => t.id === id);
  if (task) {
    task.isDeleted = true;
    task.deletedAt = new Date().toISOString();
    showNotification('已移至回收站');
  }
};

const toggleStatus = (id) => {
  const task = tasks.value.find(t => t.id === id);
  if (task) task.completed = !task.completed;
};

const restoreTask = (id) => {
  const task = tasks.value.find(t => t.id === id);
  if (task) {
    task.isDeleted = false;
    task.deletedAt = null;
    showNotification('任务已恢复');
  }
};

const permanentDelete = (id) => {
  tasks.value = tasks.value.filter(t => t.id !== id);
  showNotification('任务已永久删除');
};

const emptyTrash = () => {
  if (trashViewMode.value === 'tasks') {
    tasks.value = tasks.value.filter(t => !t.isDeleted);
  } else {
    const deletedProjectIds = projects.value.filter(p => p.isDeleted).map(p => p.id);
    projects.value = projects.value.filter(p => !p.isDeleted);
    tasks.value = tasks.value.filter(t => !(t.isDeleted && deletedProjectIds.includes(t.projectId)));
  }
  showNotification('回收站已清空');
};

const resetForm = () => {
  form.value = { title: '', desc: '', priority: 'low', date: undefined, time: DEFAULT_TIME, categories: [], projectId: 'none' };
  editingId.value = null;
};
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground flex flex-col">

    <input type="file" ref="fileInput" class="hidden" accept=".json" @change="handleImport" />

    <header class="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md shrink-0">
      <div class="container max-w-full px-6 flex h-16 items-center justify-between">
        <div class="flex items-center gap-3">
          <JoLogo class="h-8 w-8 sm:h-9 sm:w-9 shrink-0 mr-1" />
          <span class="font-bold text-lg tracking-tight">Jo's <span class="text-muted-foreground">TodoList</span></span>
        </div>

        <div class="flex items-center gap-3">
          <Button size="sm" class="gap-2 hidden sm:flex" @click="openCreateTask()">
            <Plus class="h-4 w-4" /> 新建任务
          </Button>

          <Button variant="ghost" size="icon" @click="showTrashModal = true" class="relative hover:bg-muted">
            <Trash2 class="h-5 w-5 text-muted-foreground transition-colors" />
            <Badge v-if="trashTasks.length" variant="destructive" class="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[10px]">
              {{ trashTasks.length }}
            </Badge>
          </Button>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col overflow-hidden">

      <div class="container max-w-full px-6 py-4 flex flex-col sm:flex-row gap-3 items-center border-b bg-background/50 shrink-0">
        <div class="relative w-full sm:w-[300px]">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input v-model="searchQuery" placeholder="搜索任务或项目..." class="pl-9 bg-background focus-visible:ring-1 h-9" />
        </div>

        <div class="flex border rounded-md p-1 bg-muted/30 h-9 items-center shrink-0">
          <Button variant="ghost" size="sm" class="h-7 px-3 text-xs gap-2" :class="viewMode === 'project' ? 'bg-background shadow-sm' : 'text-muted-foreground'" @click="viewMode = 'project'">
            <Kanban class="h-3.5 w-3.5" /> 看板
          </Button>
          <Button variant="ghost" size="sm" class="h-7 px-3 text-xs gap-2" :class="viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'" @click="viewMode = 'list'">
            <LayoutList class="h-3.5 w-3.5" /> 清单
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="sm" class="h-9 gap-2 border-dashed">
              <HardDrive class="h-3.5 w-3.5 text-muted-foreground" />
              数据备份
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem @click="exportData">
              <Download class="mr-2 h-3.5 w-3.5" /> 导出备份 (JSON)
            </DropdownMenuItem>
            <DropdownMenuItem @click="triggerImport">
              <Upload class="mr-2 h-3.5 w-3.5" /> 恢复数据 (Import)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" class="h-9 gap-2 border-dashed" @click="showProjectModal = true">
          <Settings2 class="h-3.5 w-3.5 text-muted-foreground" />
          项目管理
        </Button>

        <Button variant="ghost" size="sm" class="h-9 gap-2 text-xs"
          :class="showCompletedProjects ? 'text-primary bg-primary/10' : 'text-muted-foreground'"
          @click="showCompletedProjects = !showCompletedProjects">
          <component :is="showCompletedProjects ? Eye : EyeOff" class="h-3.5 w-3.5" />
          {{ showCompletedProjects ? '隐藏已完成' : '显示已完成' }}
        </Button>

        <div class="flex-1"></div>

        <Popover>
          <PopoverTrigger as-child>
            <Button variant="outline" size="sm" class="h-9 border-dashed px-3 shrink-0">
              <Filter class="mr-2 h-3.5 w-3.5" />
              类别
              <Badge v-if="filterCategories.length > 0" variant="secondary" class="ml-2 rounded-sm px-1 font-normal h-5">
                {{ filterCategories.length }}
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-[200px] p-0" align="end">
            <Command>
              <CommandInput :placeholder="'搜索类别...'" />
              <CommandList>
                <CommandEmpty>未找到类别</CommandEmpty>
                <CommandGroup>
                  <CommandItem v-for="cat in CATEGORY_OPTIONS" :key="cat" :value="cat" @select="toggleFilterCategory(cat)">
                    <div class="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary"
                         :class="filterCategories.includes(cat) ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible'">
                      <Check class="h-4 w-4" />
                    </div>
                    <span>{{ cat }}</span>
                  </CommandItem>
                </CommandGroup>
                <template v-if="filterCategories.length > 0">
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem :value="'clear'" class="justify-center text-center" @select="filterCategories = []">清除筛选</CommandItem>
                  </CommandGroup>
                </template>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div class="flex border rounded-md p-1 bg-muted/30 h-9 items-center shrink-0">
          <Button v-for="s in ['all', 'active', 'completed']" :key="s"
            variant="ghost" size="sm" class="h-7 px-3 text-xs"
            :class="filterStatus === s ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="filterStatus = s">
            {{ s === 'all' ? '全部' : (s === 'active' ? '待办' : '完成') }}
          </Button>
        </div>
      </div>

      <div v-if="filterCategories.length > 0" class="container max-w-full px-6 py-2 flex flex-wrap gap-2 items-center bg-background/30 shrink-0 border-b">
        <span class="text-xs text-muted-foreground font-medium">筛选:</span>
        <Badge v-for="cat in filterCategories" :key="cat" variant="secondary" class="h-6 px-2 text-xs font-normal border-primary/20 bg-background hover:bg-muted cursor-pointer flex items-center gap-1" @click="removeFilterCategory(cat)">
          {{ cat }} <X class="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </Badge>
        <Button variant="ghost" size="sm" class="h-6 px-2 text-xs text-muted-foreground hover:text-foreground" @click="filterCategories = []">清除</Button>
      </div>

      <div class="flex-1 flex flex-col overflow-hidden bg-muted/10 relative">

        <div v-if="viewMode === 'project'" class="flex-1 w-full h-full overflow-x-auto flex gap-6 p-6 items-start custom-scroll">
          <div v-for="group in groupedTasks" :key="group.data.id"
            class="w-[320px] shrink-0 flex flex-col max-h-full bg-background/50 rounded-xl border shadow-sm transition-opacity duration-300 min-h-0"
            :class="group.data.status === 'completed' ? 'bg-muted/30 border-dashed opacity-80' : ''"
          >

            <div class="p-3 border-b flex flex-col gap-2 shrink-0 bg-background/80 rounded-t-xl backdrop-blur-sm z-10">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <component :is="group.type === 'project' ? Folder : ArchiveRestore" class="h-4 w-4 text-muted-foreground" />
                  <h3 class="font-semibold text-sm truncate max-w-[120px]" :title="group.data.title">{{ group.data.title }}</h3>

                  <Badge v-if="group.type === 'project'" variant="outline" class="text-[9px] px-1.5 py-0 h-4 border font-normal whitespace-nowrap" :class="getProjectStatusStyle(group.data.status)">
                    {{ getProjectStatusLabel(group.data.status) }}
                  </Badge>

                  <Badge variant="secondary" class="text-[10px] h-5 px-1.5 ml-auto">{{ group.tasks.length }}</Badge>
                </div>

                <div class="flex items-center gap-1">
                  <Button variant="ghost" size="icon" class="h-6 w-6" @click="openCreateTask(group.data.id)">
                    <Plus class="h-4 w-4" />
                  </Button>

                  <DropdownMenu v-if="group.type === 'project'">
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon" class="h-6 w-6">
                        <MoreHorizontal class="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="openEditProjectModal(group.data)">
                        <PenSquare class="mr-2 h-3.5 w-3.5" /> 编辑项目
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem class="text-destructive focus:text-destructive" @click="softDeleteProject(group.data.id)">
                        <Trash2 class="mr-2 h-3.5 w-3.5" /> 删除项目
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div class="space-y-1.5">
                <p class="text-[10px] text-muted-foreground line-clamp-1">{{ group.data.desc || '无描述' }}</p>
                <span v-if="group.type === 'project' && (group.data.startDate || group.data.endDate)" class="text-[10px] text-muted-foreground font-mono block">
                  {{ group.data.startDate ? formatSimpleDate(group.data.startDate) : '...' }} -> {{ group.data.endDate ? formatSimpleDate(group.data.endDate) : '...' }}
                </span>

                <div class="flex items-center gap-2 h-3 transition-opacity duration-300" :class="group.progress > 0 ? 'opacity-100' : 'opacity-0'">
                  <div class="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                    <div class="h-full bg-primary/70 transition-all duration-1000" :style="{ width: `${group.progress}%` }"></div>
                  </div>
                  <span class="text-[10px] font-mono text-muted-foreground">{{ group.progress }}%</span>
                </div>
              </div>
            </div>

            <div class="p-2 flex-1 overflow-y-auto min-h-[100px] space-y-2 custom-scroll">
              <TransitionGroup name="list">
                <Card v-for="task in group.tasks" :key="task.id"
                  class="group transition-all duration-200 border-border/60 hover:border-primary/30 hover:shadow-md cursor-pointer"
                  :class="[
                    task.completed ? 'opacity-50 bg-muted/20 border-transparent shadow-none' : 'bg-card',
                    isUrgent(task) ? 'border-amber-500/50 bg-amber-50/10 shadow-sm animate-shake' : ''
                  ]"
                  @click="editTask(task)"
                >
                  <CardContent class="p-3 relative">
                    <div v-if="isUrgent(task)" class="absolute top-2 right-2 text-amber-500"><AlertTriangle class="h-3 w-3" /></div>

                    <div class="flex gap-2 items-start">
                      <button class="mt-0.5 shrink-0 focus:outline-none z-10" @click.stop="toggleStatus(task.id)">
                        <CheckCircle2 v-if="task.completed" class="h-4 w-4 text-muted-foreground" />
                        <Circle v-else class="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>

                      <div class="flex-1 min-w-0 space-y-1.5">
                        <div class="flex flex-wrap gap-1.5 items-start pr-4">
                          <span class="text-sm font-medium leading-tight break-all" :class="{'line-through text-muted-foreground': task.completed}">
                            {{ task.title }}
                          </span>
                        </div>

                        <p v-if="task.desc" class="text-xs text-muted-foreground line-clamp-2">{{ task.desc }}</p>

                        <div v-if="task.categories.length || task.priority !== 'none'" class="flex flex-wrap gap-1">
                          <Badge v-if="task.priority !== 'none'" variant="outline" class="text-[10px] px-1 py-0 h-4 border" :class="getPriorityStyles(task.priority)">
                            {{ task.priority }}
                          </Badge>
                          <Badge v-for="cat in task.categories" :key="cat" variant="secondary" class="text-[10px] px-1 py-0 h-4 font-normal bg-muted">
                            {{ cat }}
                          </Badge>
                        </div>

                        <div class="flex justify-between items-center pt-1">
                          <span v-if="task.dueDate" class="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <CalendarIcon class="h-3 w-3 opacity-70" /> {{ formatDate(task.dueDate) }}
                          </span>
                          <Button variant="ghost" size="icon" class="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" @click.stop="softDelete(task.id)">
                            <Trash2 class="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TransitionGroup>

              <Button variant="ghost" class="w-full text-xs text-muted-foreground border border-dashed border-border/50 hover:bg-muted/50 h-9" @click="openCreateTask(group.data.id)">
                <Plus class="h-3 w-3 mr-1" /> 添加任务
              </Button>
            </div>
          </div>

          <div class="w-2 shrink-0"></div>
        </div>

        <div v-else class="h-full overflow-y-auto custom-scroll">
          <div class="container max-w-4xl mx-auto p-6 space-y-3">
            <TransitionGroup name="list">
              <Card v-for="task in flatFilteredTasks" :key="task.id"
                class="group transition-all duration-200 hover:shadow-md cursor-pointer"
                :class="[
                  task.completed ? 'opacity-50 bg-muted/20 border-transparent shadow-none' : 'bg-card',
                  isUrgent(task) ? 'border-amber-500/50 bg-amber-50/10 shadow-sm animate-shake' : 'hover:border-foreground/20'
                ]"
                @click="editTask(task)"
              >
                <CardContent class="p-4 flex gap-4 items-center relative">
                  <div v-if="isUrgent(task)" class="absolute top-2 right-2 text-amber-500"><AlertTriangle class="h-3 w-3" /></div>

                  <button class="shrink-0 focus:outline-none z-10" @click.stop="toggleStatus(task.id)">
                    <CheckCircle2 v-if="task.completed" class="h-5 w-5 text-muted-foreground" />
                    <Circle v-else class="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>

                  <div class="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div class="md:col-span-2 space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-sm sm:text-base break-all" :class="{'line-through text-muted-foreground': task.completed}">
                          {{ task.title }}
                        </span>
                        <Badge v-if="task.priority !== 'none'" variant="outline" class="shrink-0 text-[10px] px-1.5 py-0 h-5" :class="getPriorityStyles(task.priority)">{{ task.priority }}</Badge>
                      </div>
                      <p v-if="task.desc" class="text-xs text-muted-foreground line-clamp-1">{{ task.desc }}</p>
                    </div>

                    <div class="flex items-center gap-2 text-xs md:justify-center">
                      <Badge v-if="task.projectId && activeProjects.find(p => p.id === task.projectId)" variant="secondary" class="font-normal bg-muted">
                        📁 {{ activeProjects.find(p => p.id === task.projectId).title }}
                      </Badge>
                      <div v-if="task.categories.length" class="flex flex-wrap gap-1">
                        <span v-for="cat in task.categories" :key="cat" class="text-muted-foreground bg-muted/50 px-1.5 rounded-sm">#{{ cat }}</span>
                      </div>
                    </div>

                    <div class="flex items-center justify-end gap-3">
                      <span v-if="task.dueDate" class="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <CalendarIcon class="h-3 w-3 opacity-70" /> {{ formatDate(task.dueDate) }}
                      </span>
                      <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-destructive z-10" @click.stop="softDelete(task.id)">
                        <Trash2 class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TransitionGroup>

            <div v-if="flatFilteredTasks.length === 0" class="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
              <LayoutDashboard class="h-10 w-10 mb-3 stroke-1 opacity-50" />
              <p class="text-sm font-medium">没有找到任务</p>
              <Button variant="link" @click="openCreateTask()">去创建一个</Button>
            </div>
          </div>
        </div>

      </div>
    </main>

    <Dialog v-model:open="showTaskModal">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{{ editingId ? '编辑任务' : '新建任务' }}</DialogTitle>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">任务内容</Label>
            <Input v-model="form.title" placeholder="要做什么？" />
          </div>

          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">备注</Label>
            <Textarea v-model="form.desc" placeholder="细节..." class="resize-none" rows="3" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">所属项目</Label>
              <Select v-model="form.projectId">
                <SelectTrigger>
                  <SelectValue placeholder="选择项目" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span class="text-muted-foreground">🚫 未归档 (独立任务)</span>
                  </SelectItem>
                  <SelectItem v-for="p in activeProjects" :key="p.id" :value="p.id">
                    📁 {{ p.title }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">优先级</Label>
              <Select v-model="form.priority">
                <SelectTrigger>
                  <SelectValue placeholder="选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 高 (High)</SelectItem>
                  <SelectItem value="medium">🟠 中 (Medium)</SelectItem>
                  <SelectItem value="low">🔵 低 (Low)</SelectItem>
                  <SelectItem value="none">⚪ 无</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">截止时间</Label>
            <div class="flex gap-2">
                <div class="flex-1">
                    <EnhancedDatePicker v-model="form.date" />
                </div>
                <div class="w-[100px] flex items-center bg-muted/30 px-2 rounded-md border border-dashed">
                    <Clock class="h-4 w-4 text-muted-foreground mr-1" />
                    <input type="time" v-model="form.time" class="w-full bg-transparent text-sm focus:outline-none font-mono cursor-pointer" />
                </div>
            </div>
          </div>

          <div class="space-y-3">
            <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">类别 (多选)</Label>
            <div class="grid grid-cols-2 gap-3">
              <div v-for="cat in CATEGORY_OPTIONS" :key="cat" class="flex items-center space-x-2">
                <Checkbox
                  :id="`category-${cat}`"
                  :model-value="form.categories.includes(cat)"
                  @update:model-value="(val) => handleCategoryChange(cat, val)"
                />
                <label :for="`category-${cat}`" class="text-sm font-medium leading-none cursor-pointer text-muted-foreground hover:text-foreground select-none">
                  {{ cat }}
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showTaskModal = false">取消</Button>
          <Button @click="handleSubmit">{{ editingId ? '保存更改' : '创建任务' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showProjectModal">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>项目管理</DialogTitle>
          <DialogDescription>创建或编辑项目。删除项目将同时删除其下的所有任务。</DialogDescription>
        </DialogHeader>

        <div class="space-y-4 my-4 max-h-[300px] overflow-y-auto pr-2 custom-scroll" v-if="activeProjects.length > 0">
          <div v-for="p in activeProjects" :key="p.id" class="flex items-center justify-between p-3 border rounded-md bg-muted/10 group">
            <div class="flex flex-col gap-1">
              <span class="font-medium text-sm flex items-center gap-2">
                <Folder class="h-4 w-4 text-primary" /> {{ p.title }}
                <Badge variant="outline" class="text-[9px] px-1 h-4 font-normal" :class="getProjectStatusStyle(p.status)">
                  {{ getProjectStatusLabel(p.status) }}
                </Badge>
              </span>
              <span class="text-xs text-muted-foreground line-clamp-1">{{ p.desc || '无描述' }}</span>
              <span class="text-[10px] text-muted-foreground font-mono" v-if="p.startDate || p.endDate">
                {{ formatSimpleDate(p.startDate) }} -> {{ formatSimpleDate(p.endDate) }}
              </span>
            </div>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" class="h-7 w-7" @click="editProject(p)"><PenSquare class="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" class="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" @click="softDeleteProject(p.id)"><Trash2 class="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md mb-4">
          暂无项目，创建一个吧！
        </div>

        <Separator />

        <div class="space-y-4 pt-4">
          <h4 class="text-sm font-medium">{{ projectForm.id ? '编辑项目' : '新建项目' }}</h4>
          <div class="grid gap-3">
            <div class="grid grid-cols-4 items-center gap-4">
              <Label class="text-right text-xs">名称</Label>
              <Input v-model="projectForm.title" class="col-span-3 h-8" placeholder="项目名称..." />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label class="text-right text-xs">描述</Label>
              <Input v-model="projectForm.desc" class="col-span-3 h-8" placeholder="简短描述..." />
            </div>

            <div class="grid grid-cols-4 items-center gap-4">
              <Label class="text-right text-xs">状态</Label>
              <Select v-model="projectForm.status">
                <SelectTrigger class="col-span-3 h-8">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="s in PROJECT_STATUS_OPTIONS" :key="s.value" :value="s.value">
                    <div class="flex items-center gap-2">
                      <div class="w-2 h-2 rounded-full" :class="s.color.split(' ')[1].replace('text-', 'bg-')"></div>
                      {{ s.label }}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="grid grid-cols-4 items-center gap-4">
              <Label class="text-right text-xs">起止时间</Label>
              <div class="col-span-3 flex gap-2">
                <EnhancedDatePicker v-model="projectForm.startDate" placeholderText="开始时间" />
                <span class="text-muted-foreground self-center">-</span>
                <EnhancedDatePicker v-model="projectForm.endDate" placeholderText="结束时间" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button v-if="projectForm.id" variant="ghost" size="sm" @click="projectForm = { id: null, title: '', desc: '', status: 'not_started', startDate: undefined, endDate: undefined }">取消编辑</Button>
          <Button size="sm" @click="saveProject">{{ projectForm.id ? '更新' : '创建' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showTrashModal">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>回收站</DialogTitle>
          <div class="flex border rounded-md p-0.5 bg-muted/50 h-7 items-center">
             <Button variant="ghost" size="sm" class="h-6 px-2 text-[10px]" :class="trashViewMode === 'tasks' ? 'bg-background shadow-sm' : 'text-muted-foreground'" @click="trashViewMode = 'tasks'">任务</Button>
             <Button variant="ghost" size="sm" class="h-6 px-2 text-[10px]" :class="trashViewMode === 'projects' ? 'bg-background shadow-sm' : 'text-muted-foreground'" @click="trashViewMode = 'projects'">项目</Button>
          </div>
        </DialogHeader>
        <DialogDescription>30天内删除的内容。</DialogDescription>

        <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-2 my-2 custom-scroll">
          <div v-if="trashViewMode === 'tasks'">
            <div v-if="trashTasks.length === 0" class="text-center py-8 text-sm text-muted-foreground">空</div>
            <div v-for="task in trashTasks" :key="task.id" class="flex items-center justify-between p-3 border rounded-md bg-muted/20">
              <span class="text-sm line-through text-muted-foreground truncate max-w-[200px]">{{ task.title }}</span>
              <div class="flex gap-2">
                 <Button size="sm" variant="outline" class="h-7 text-xs" @click="restoreTask(task.id)">恢复</Button>
                 <Button size="sm" variant="ghost" class="h-7 text-xs text-destructive hover:bg-destructive/10" @click="permanentDelete(task.id)">彻底删除</Button>
              </div>
            </div>
          </div>
          <div v-else>
            <div v-if="trashProjects.length === 0" class="text-center py-8 text-sm text-muted-foreground">空</div>
            <div v-for="proj in trashProjects" :key="proj.id" class="flex items-center justify-between p-3 border rounded-md bg-muted/20">
              <div class="flex flex-col">
                <span class="text-sm font-medium line-through text-muted-foreground truncate max-w-[200px]">{{ proj.title }}</span>
                <span class="text-[10px] text-muted-foreground">关联任务将会一同恢复</span>
              </div>
              <div class="flex gap-2">
                 <Button size="sm" variant="outline" class="h-7 text-xs" @click="restoreProject(proj.id)">恢复</Button>
                 <Button size="sm" variant="ghost" class="h-7 text-xs text-destructive hover:bg-destructive/10" @click="permanentDeleteProject(proj.id)">彻底删除</Button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter class="sm:justify-between flex-row items-center pt-2">
          <span class="text-xs text-muted-foreground">自动清理</span>
          <Button v-if="(trashViewMode === 'tasks' && trashTasks.length) || (trashViewMode === 'projects' && trashProjects.length)" variant="destructive" size="sm" @click="emptyTrash">清空</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Transition name="slide-up">
      <div v-if="notification.show"
        class="fixed bottom-6 right-6 px-5 py-3 rounded-md shadow-2xl border text-sm font-medium flex items-center gap-3 z-[60] bg-foreground text-background">
        <AlertCircle v-if="notification.type === 'error'" class="h-4 w-4 text-destructive-foreground" />
        <CheckCircle2 v-else class="h-4 w-4" />
        {{ notification.message }}
      </div>
    </Transition>
  </div>
</template>

<style>
.list-enter-active, .list-leave-active { transition: all 0.3s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(5px); }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(20px); }

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}
.animate-shake {
  animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both;
}

/* 🟢 通用自定义滚动条 (同时支持横向和纵向) */
.custom-scroll {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.custom-scroll::-webkit-scrollbar {
  height: 8px; /* 横向高度 */
  width: 6px;  /* 纵向宽度 */
}
.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background-color: transparent; /* 默认隐藏 */
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: content-box;
}
/* 鼠标悬停时显示 */
.custom-scroll:hover {
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
}
.custom-scroll:hover::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
}
</style>