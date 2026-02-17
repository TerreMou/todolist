<script setup>
import {ref, computed, onMounted, watch, nextTick} from 'vue';
import {
  Trash2, Plus, Calendar as CalendarIcon, CheckCircle2, Circle, Search,
  LayoutDashboard, PenSquare, AlertTriangle, AlertCircle, X, Check, Filter, Folder, LayoutList, Grip,
  ArchiveRestore, Kanban, Settings2, MoreHorizontal, Download, Upload, Archive, MoreVertical
} from 'lucide-vue-next';
import {parseDate} from '@internationalized/date';
import Sortable from 'sortablejs';

// UI Components (Shadcn)
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import { OverflowTooltipText, TooltipProvider } from '@/components/ui/tooltip';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import CompletedProjectsDialog from '@/components/business/CompletedProjectsDialog.vue';
import ProjectManagementDialog from '@/components/business/ProjectManagementDialog.vue';
import TaskFormDialog from '@/components/business/TaskFormDialog.vue';
import TrashDialog from '@/components/business/TrashDialog.vue';

// Constants & Composables
import {
  TASK_TYPE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  EVENT_TYPE_OPTIONS,
  BUSINESS_LINE_FIRST,
  BUSINESS_LINE_SECOND
} from '@/constants';
import {
  formatSimpleDate,
} from '@/utils/dateTime';
import {
  isUrgent,
  getPriorityStyles,
  getProjectStatusStyle,
  getProjectStatusLabel
} from '@/utils/validators';
import { useNotification } from '@/composables/useNotification';
import { useStorage } from '@/composables/useStorage';
import { useTasks } from '@/composables/useTasks';
import { useProjects } from '@/composables/useProjects';

// --- State ---
const tasks = ref([]);
const projects = ref([]);
const editingId = ref(null);

// Modals
const showTrashModal = ref(false);
const showProjectModal = ref(false);
const showTaskModal = ref(false);
const showCompletedModal = ref(false);

const trashViewMode = ref('tasks');

// Forms
const form = ref({
  title: '',
  desc: '',
  contact: '',
  priority: 'low',
  date: undefined,
  taskType: '',
  projectId: ''
});

const projectForm = ref({
  id: null,
  title: '',
  desc: '',
  status: 'not_started',
  startDate: undefined,
  endDate: undefined,
  projectType: '',
  eventType: '',
  businessLine: ''
});

const searchQuery = ref('');
const filterStatus = ref('all');
const filterTypes = ref([]);
const viewMode = ref('project');

// Sorting mode toggle
const isSortingMode = ref(false);

// File input ref
const fileInput = ref(null);

// --- Composables ---
const { notification, showNotification } = useNotification();
const { loadFromLocalStorage, saveToLocalStorage, exportData, importData } = useStorage();
const {
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
} = useTasks(tasks, projects, showNotification);
const {
  activeProjects,
  trashProjects,
  completedProjectsList,
  selectableProjects,
  createProject,
  updateProject,
  updateProjectStatus,
  unarchiveProject,
  softDeleteProject,
  restoreProject,
  confirmSoftDeleteProject,
  confirmPermanentDeleteProject,
  emptyProjectTrash
} = useProjects(projects, tasks, showNotification);

// --- Computed Properties ---

// 统计信息
const stats = computed(() => {
  const total = activeTasks.value.length;
  const completed = activeTasks.value.filter(t => t.completed).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, progress };
});

const isSameId = (a, b) => {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return String(a) === String(b);
};

const findProjectById = (projectId) => activeProjects.value.find(p => isSameId(p.id, projectId));

// 看板视图的分组任务
const groupedTasks = computed(() => {
  const groups = [];
  const filteredTasks = getSortedFilteredTasks(
    activeTasks.value,
    searchQuery.value,
    filterStatus.value,
    filterTypes.value
  );

  // 1. 未归档任务
  const inboxTasks = filteredTasks.filter(t => !t.projectId || t.projectId === 'none');
  groups.push({
    type: 'inbox',
    data: {
      id: 'none',
      title: '未归档任务',
      desc: '不属于任何特定项目的独立任务',
      status: 'active'
    },
    tasks: inboxTasks,
    progress: 0
  });

  // 2. 活跃项目任务 - 按 sortOrder 排序
  const sortedProjects = [...activeProjects.value]
    .filter(p => p.status !== 'completed')
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  sortedProjects.forEach(proj => {
    const projTasks = filteredTasks.filter(t => isSameId(t.projectId, proj.id));
    const stats = getProjectTaskStats(proj.id);

    groups.push({
      type: 'project',
      data: proj,
      tasks: projTasks,
      progress: stats.progress
    });
  });

  // 搜索时过滤空的分组
  if (!searchQuery.value.trim()) return groups;

  const query = searchQuery.value.toLowerCase();
  return groups.filter(g => {
    const hasMatchingTasks = g.tasks.length > 0;
    const isProjectMatch = g.data.title.toLowerCase().includes(query);
    return hasMatchingTasks || isProjectMatch;
  });
});

// 列表视图的扁平任务
const flatFilteredTasks = computed(() =>
  getSortedFilteredTasks(
    activeTasks.value,
    searchQuery.value,
    filterStatus.value,
    filterTypes.value
  )
);

// 可选择的项目（编辑时排除已完成）
const selectableProjectsList = computed(() =>
  selectableProjects(editingId.value ? form.value.projectId : null)
);

// --- Lifecycle & Side Effects ---

onMounted(() => {
  const { tasks: loadedTasks, projects: loadedProjects } = loadFromLocalStorage();
  tasks.value = loadedTasks;
  projects.value = loadedProjects;
});

watch([tasks, projects], () => {
  saveToLocalStorage(tasks.value, projects.value);
}, { deep: true });

// --- Operations ---

const handleExportData = () => {
  exportData(tasks.value, projects.value, showNotification);
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
      const success = importData(parsed, tasks, projects, showNotification);
      if (success) {
        // Reset forms after successful import
        resetForm();
        resetProjectForm();
      }
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
};

// Task form operations
const openCreateTask = (projectId = 'none') => {
  resetForm();
  form.value.projectId = projectId === 'none' ? '' : projectId;
  showTaskModal.value = true;
};

const handleTaskSubmit = () => {
  const finalDueDate = form.value.date ? form.value.date.toString() : '';
  let success = false;

  if (editingId.value) {
    success = updateTask(
      editingId.value,
      form.value.title,
      form.value.desc,
      form.value.priority,
      finalDueDate,
      form.value.taskType,
      form.value.contact,
      form.value.projectId
    );
  } else {
    success = createTask(
      form.value.title,
      form.value.desc,
      form.value.priority,
      finalDueDate,
      form.value.taskType,
      form.value.contact,
      form.value.projectId
    );
  }

  if (!success) return;

  editingId.value = null;
  showTaskModal.value = false;
  resetForm();
};

const editTaskForm = (task) => {
  const formData = prepareTaskForEdit(task);
  form.value = formData;
  editingId.value = task.id;
  showTaskModal.value = true;
};

// Project form operations
const handleProjectSubmit = () => {
  if (projectForm.value.id) {
    updateProject(
      projectForm.value.id,
      projectForm.value.title,
      projectForm.value.desc,
      projectForm.value.status,
      projectForm.value.startDate,
      projectForm.value.endDate,
      projectForm.value.projectType,
      projectForm.value.eventType,
      projectForm.value.businessLine
    );
  } else {
    createProject(
      projectForm.value.title,
      projectForm.value.desc,
      projectForm.value.status,
      projectForm.value.startDate,
      projectForm.value.endDate,
      projectForm.value.projectType,
      projectForm.value.eventType,
      projectForm.value.businessLine
    );
  }

  resetProjectForm();
  showProjectModal.value = false;
};

const editProjectForm = (proj) => {
  projectForm.value = {
    id: proj.id,
    title: proj.title,
    desc: proj.desc,
    status: proj.status || 'not_started',
    startDate: proj.startDate ? parseDate(proj.startDate) : undefined,
    endDate: proj.endDate ? parseDate(proj.endDate) : undefined,
    projectType: proj.projectType || '',
    eventType: proj.eventType || '',
    businessLine: proj.businessLine || ''
  };
};

const handleDeleteProject = (projectId) => {
  // 项目删除时，关联任务一并移入回收站
  confirmSoftDeleteProject(projectId, true);
};

const handlePermanentDeleteProject = (projectId) => {
  // 永久删除项目时，关联任务一并永久删除
  confirmPermanentDeleteProject(projectId, true);
};

const toggleFilterType = (cat) => {
  const index = filterTypes.value.indexOf(cat);
  if (index === -1) {
    filterTypes.value.push(cat);
  } else {
    filterTypes.value.splice(index, 1);
  }
};

const removeFilterType = (cat) => {
  filterTypes.value = filterTypes.value.filter(c => c !== cat);
};

// Initialize sortable for kanban view
const initSortable = async () => {
  if (viewMode.value !== 'project' || !isSortingMode.value) return;

  await nextTick();

  const container = document.querySelector('.kanban-container');
  if (!container) return;

  Sortable.create(container, {
    group: 'projects',
    animation: 150,
    ghostClass: 'sortable-ghost',
    dragClass: 'drag-item',
    onEnd: (evt) => {
      const projectsInOrder = Array.from(container.children)
        .map(el => parseInt(el.dataset.projectId))
        .filter(id => !isNaN(id));

      // Update sortOrder based on new position
      projectsInOrder.forEach((projectId, index) => {
        const proj = projects.value.find(p => p.id === projectId);
        if (proj) {
          proj.sortOrder = index * 1000;
        }
      });

      saveToLocalStorage(tasks.value, projects.value);
      showNotification('项目排序已更新');
    }
  });
};

const toggleSortingMode = () => {
  isSortingMode.value = !isSortingMode.value;
  if (isSortingMode.value) {
    initSortable();
  }
};

// Trash operations
const handleSoftDeleteTask = (taskId) => {
  softDeleteTask(taskId);
};

const handleRestoreTask = (taskId) => {
  restoreTask(taskId);
};

const handlePermanentDeleteTask = (taskId) => {
  permanentDeleteTask(taskId);
};

const handleEmptyTrash = () => {
  if (trashViewMode.value === 'tasks') {
    emptyTaskTrash();
  } else {
    emptyProjectTrash();
  }
};

// Form reset operations
const resetForm = () => {
  form.value = {
    title: '',
    desc: '',
    contact: '',
    priority: 'low',
    date: undefined,
    taskType: '',
    projectId: ''
  };
  editingId.value = null;
};

const resetProjectForm = () => {
  projectForm.value = {
    id: null,
    title: '',
    desc: '',
    status: 'not_started',
    startDate: undefined,
    endDate: undefined,
    projectType: '',
    eventType: '',
    businessLine: ''
  };
};
</script>

<template>
  <div class="h-screen w-full overflow-hidden bg-background text-foreground font-sans flex flex-col">
    <TooltipProvider :delay-duration="180">

    <input type="file" ref="fileInput" class="hidden" accept=".json" @change="handleImport"/>

    <header class="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur shrink-0 flex-none">
      <div class="container max-w-full px-6 flex h-14 items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="font-bold text-lg tracking-tight">Jo's List</span>
        </div>

        <div class="flex items-center gap-2">
          <Button size="sm" class="gap-2 hidden sm:flex" @click="openCreateTask()">
            <Plus class="h-4 w-4"/>
            新建任务
          </Button>
          <Button variant="outline" size="sm" class="h-9 gap-2 border-dashed hidden sm:flex" @click="showProjectModal = true">
            <Settings2 class="h-4 w-4"/>
            项目管理
          </Button>

          <Button variant="ghost" size="icon" @click="showTrashModal = true" class="relative">
            <Trash2 class="h-5 w-5"/>
            <Badge v-if="trashTasks.length" variant="destructive"
                   class="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]">
              {{ trashTasks.length }}
            </Badge>
          </Button>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col overflow-hidden min-h-0">

      <div
          class="container max-w-full px-6 py-3 flex flex-col sm:flex-row gap-3 items-center border-b bg-muted/20 shrink-0 flex-none">

        <div class="relative w-full sm:w-[300px]">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input v-model="searchQuery" placeholder="搜索..." class="pl-9 bg-background"/>
        </div>

        <div class="flex bg-muted p-1 rounded-md h-9 items-center shrink-0">
          <Button variant="ghost" size="sm" class="h-7 px-3 text-xs"
                  :class="viewMode === 'project' ? 'bg-background shadow-sm' : 'text-muted-foreground'"
                  @click="viewMode = 'project'">
            <Kanban class="h-4 w-4 mr-1"/>
            看板
          </Button>
          <Button variant="ghost" size="sm" class="h-7 px-3 text-xs"
                  :class="viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'"
                  @click="viewMode = 'list'">
            <LayoutList class="h-4 w-4 mr-1"/>
            清单
          </Button>
        </div>

        <Button v-if="viewMode === 'project'"
                :variant="isSortingMode ? 'default' : 'outline'"
                size="sm"
                class="h-9 px-4 shrink-0 font-medium transition-all duration-300 relative overflow-hidden"
                :class="{
                  'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg sort-btn-active': isSortingMode,
                  'border-dashed border-muted-foreground/40 hover:border-primary hover:bg-primary/5': !isSortingMode
                }"
                @click="toggleSortingMode">
          <span class="flex items-center gap-2">
            <Grip class="h-4 w-4 transition-transform duration-300" :class="isSortingMode ? 'rotate-90 scale-110' : 'scale-100'"/>
            <span class="transition-all duration-300">
              {{ isSortingMode ? '完成排序' : '排序项目' }}
            </span>
          </span>
        </Button>

        <Popover>
          <PopoverTrigger as-child>
            <Button variant="outline" size="sm" class="h-9 border-dashed px-3 shrink-0">
              <Filter class="mr-2 h-4 w-4"/>
              类型
              <Badge v-if="filterTypes.length > 0" variant="secondary"
                     class="ml-2 rounded-sm px-1 font-normal h-5">
                {{ filterTypes.length }}
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-[200px] p-0" align="end">
            <Command>
              <CommandInput placeholder="搜索类型..."/>
              <CommandList>
                <CommandEmpty>无</CommandEmpty>
                <CommandGroup>
                  <CommandItem v-for="cat in TASK_TYPE_OPTIONS" :key="cat" :value="cat"
                               @select="toggleFilterType(cat)">
                    <div class="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary"
                         :class="filterTypes.includes(cat) ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible'">
                      <Check class="h-4 w-4"/>
                    </div>
                    <span>{{ cat }}</span>
                  </CommandItem>
                </CommandGroup>
                <template v-if="filterTypes.length > 0">
                  <CommandSeparator/>
                  <CommandGroup>
                    <CommandItem :value="'clear'" class="justify-center text-center" @select="filterTypes = []">
                      清除筛选
                    </CommandItem>
                  </CommandGroup>
                </template>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div class="flex bg-muted p-1 rounded-md h-9 items-center shrink-0">
          <Button v-for="s in ['all', 'active', 'completed']" :key="s"
                  variant="ghost" size="sm" class="h-7 px-3 text-xs"
                  :class="filterStatus === s ? 'bg-background shadow-sm' : 'text-muted-foreground'"
                  @click="filterStatus = s">
            {{ s === 'all' ? '全部' : (s === 'active' ? '待办' : '完成') }}
          </Button>
        </div>

        <div class="flex-1"></div>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="h-9 w-9">
              <MoreVertical class="h-4 w-4"/>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>数据与归档</DropdownMenuLabel>
            <DropdownMenuSeparator/>
            <DropdownMenuItem @click="showCompletedModal = true">
              <Archive class="mr-2 h-4 w-4"/>
              已完成项目
            </DropdownMenuItem>
            <DropdownMenuSeparator/>
            <DropdownMenuItem @click="handleExportData">
              <Download class="mr-2 h-4 w-4"/>
              导出备份 (JSON)
            </DropdownMenuItem>
            <DropdownMenuItem @click="triggerImport">
              <Upload class="mr-2 h-4 w-4"/>
              恢复数据 (Import)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

      <div v-if="filterTypes.length > 0"
           class="container max-w-full px-6 py-2 flex flex-wrap gap-2 items-center bg-muted/10 shrink-0 border-b flex-none">
        <span class="text-xs text-muted-foreground font-medium">筛选中:</span>
        <Badge v-for="cat in filterTypes" :key="cat" variant="secondary"
               class="h-6 cursor-pointer flex items-center gap-1" @click="removeFilterType(cat)">
          {{ cat }}
          <X class="h-3 w-3 text-muted-foreground hover:text-foreground"/>
        </Badge>
        <Button variant="ghost" size="sm" class="h-6 px-2 text-xs text-muted-foreground" @click="filterTypes = []">
          清除
        </Button>
      </div>

      <div class="flex-1 flex flex-col overflow-hidden relative min-h-0" :class="{ 'sorting-mode': isSortingMode }">

        <div v-if="viewMode === 'project'"
             class="kanban-container flex-1 w-full h-full overflow-x-auto flex gap-6 p-6 items-start custom-scroll">
          <div v-for="group in groupedTasks" :key="group.data.id"
               :data-project-id="group.type === 'project' ? group.data.id : null"
               class="w-[300px] shrink-0 flex flex-col max-h-full bg-muted/30 rounded-xl border min-h-0 transition-all"
               :class="{ 'cursor-grab active:cursor-grabbing': isSortingMode && group.type === 'project' }"
          >
            <div class="p-3 border-b flex flex-col gap-2 shrink-0 bg-muted/10 rounded-t-xl z-10">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <component v-if="isSortingMode && group.type === 'project'"
                             :is="Grip"
                             class="h-4 w-4 text-muted-foreground flex-shrink-0 hover:text-foreground transition-colors"/>
                  <component v-else :is="group.type === 'project' ? Folder : ArchiveRestore"
                             class="h-4 w-4 text-muted-foreground"/>
                  <OverflowTooltipText
                    tag="h3"
                    class-name="font-semibold text-sm truncate max-w-[140px]"
                    :text="group.data.title"
                  />

                  <Badge v-if="group.type === 'project'" variant="outline"
                         class="text-[10px] px-1 py-0 h-4 whitespace-nowrap bg-background"
                         :class="getProjectStatusStyle(group.data.status)">
                    {{ getProjectStatusLabel(group.data.status) }}
                  </Badge>

                  <span class="text-xs text-muted-foreground ml-1">{{ group.tasks.length }}</span>
                </div>

                <div class="flex items-center gap-1">
                  <Button v-if="group.data.status !== 'completed'" variant="ghost" size="icon" class="h-7 w-7"
                          @click="openCreateTask(group.data.id)">
                    <Plus class="h-4 w-4"/>
                  </Button>

                  <DropdownMenu v-if="group.type === 'project'">
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon" class="h-7 w-7">
                        <MoreHorizontal class="h-4 w-4"/>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="editProjectForm(group.data); showProjectModal = true">
                        <PenSquare class="mr-2 h-4 w-4"/>
                        编辑项目
                      </DropdownMenuItem>
                      <DropdownMenuSeparator/>
                      <DropdownMenuItem class="text-destructive focus:text-destructive"
                                        @click="handleDeleteProject(group.data.id)">
                        <Trash2 class="mr-2 h-4 w-4"/>
                        删除项目
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div v-if="group.type === 'project' && (group.data.projectType || group.data.eventType || group.data.businessLine)" class="flex gap-2">
                <Badge v-if="group.data.projectType" variant="secondary" class="text-[10px] px-2 py-0.5 h-5">
                  {{ PROJECT_TYPE_OPTIONS.find(t => t.value === group.data.projectType)?.label || group.data.projectType }}
                </Badge>
                <Badge v-if="group.data.eventType" variant="secondary" class="text-[10px] px-2 py-0.5 h-5">
                  {{ EVENT_TYPE_OPTIONS.find(e => e.value === group.data.eventType)?.label || group.data.eventType }}
                </Badge>
                <Badge v-if="group.data.businessLine" variant="secondary" class="text-[10px] px-2 py-0.5 h-5 font-semibold">
                  {{ group.data.businessLine }}
                </Badge>
              </div>

              <div v-if="group.data.desc" class="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {{ group.data.desc }}
              </div>

              <div v-if="group.data.startDate || group.data.endDate" class="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarIcon class="h-3 w-3 opacity-70"/>
                <span v-if="group.data.startDate && group.data.endDate">
                  {{ formatSimpleDate(group.data.startDate) }} - {{ formatSimpleDate(group.data.endDate) }}
                </span>
                <span v-else-if="group.data.startDate">开始: {{ formatSimpleDate(group.data.startDate) }}</span>
                <span v-else-if="group.data.endDate">结束: {{ formatSimpleDate(group.data.endDate) }}</span>
              </div>

              <div class="flex items-center gap-2 h-1.5" :class="group.progress > 0 ? 'opacity-100' : 'opacity-0'">
                <div class="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div class="h-full bg-primary transition-all duration-500"
                       :style="{ width: `${group.progress}%` }"></div>
                </div>
              </div>
            </div>

            <div class="p-3 flex-1 overflow-y-auto min-h-0 space-y-3 custom-scroll">
              <TransitionGroup name="list">
                <Card v-for="task in group.tasks" :key="task.id"
                      class="group transition-all duration-200 border-border/60 hover:border-primary/30 hover:shadow-md cursor-default"
                      :class="[
                    task.completed ? 'opacity-50 bg-muted/20 border-transparent shadow-none' : 'bg-card',
                    isUrgent(task) ? 'border-amber-500/50 bg-amber-50/10 shadow-sm animate-shake' : ''
                  ]"
                >
                  <CardContent class="p-3 relative">
                    <div v-if="isUrgent(task)" class="absolute top-2 right-2 text-amber-500">
                      <AlertTriangle class="h-3 w-3"/>
                    </div>
                    <div class="flex gap-2 items-start">
                      <button class="mt-0.5 shrink-0 focus:outline-none z-10" @click.stop="toggleTaskStatus(task.id)">
                        <CheckCircle2 v-if="task.completed" class="h-4 w-4 text-muted-foreground"/>
                        <Circle v-else
                                class="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"/>
                      </button>

                      <div class="flex-1 min-w-0 space-y-1.5">
                        <div class="flex flex-wrap gap-1.5 items-start pr-4">
                          <OverflowTooltipText
                            tag="span"
                            :class-name="[
                              'block max-w-[180px] truncate text-sm font-medium leading-tight',
                              { 'line-through text-muted-foreground': task.completed }
                            ]"
                            :text="task.title"
                          />
                        </div>

                        <OverflowTooltipText
                          v-if="task.desc"
                          tag="div"
                          class-name="truncate text-xs text-muted-foreground leading-relaxed pt-1"
                          :text="task.desc"
                        />

                        <div v-if="task.taskType || task.priority !== 'none'" class="flex flex-wrap gap-1">
                          <Badge v-if="task.priority !== 'none'" variant="outline"
                                 class="text-[10px] px-1 py-0 h-4 border" :class="getPriorityStyles(task.priority)">
                            {{ task.priority }}
                          </Badge>
                          <span v-if="task.taskType"
                                class="text-[10px] text-muted-foreground bg-muted px-1 rounded-sm border border-border/50">
                            {{ task.taskType }}
                          </span>
                        </div>

                        <div class="flex items-center gap-2 pt-1 min-w-0">
                          <span v-if="task.dueDate" class="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <CalendarIcon class="h-3 w-3 opacity-70"/> {{ formatSimpleDate(task.dueDate) }}
                          </span>
                          <OverflowTooltipText
                            v-if="task.contact"
                            tag="span"
                            class-name="min-w-0 flex-1 truncate text-[10px] text-muted-foreground"
                            :text="`联系人: ${task.contact}`"
                          />

                          <div class="shrink-0 flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-muted text-muted-foreground"
                                    @click.stop="editTaskForm(task)" title="编辑">
                              <PenSquare class="h-3.5 w-3.5"/>
                            </Button>
                            <Button variant="ghost" size="icon"
                                    class="h-6 w-6 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                    @click.stop="handleSoftDeleteTask(task.id)" title="删除">
                              <Trash2 class="h-3.5 w-3.5"/>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TransitionGroup>

              <Button v-if="group.data.status !== 'completed'" variant="ghost"
                      class="w-full text-xs text-muted-foreground border border-dashed border-border/60 hover:bg-background h-8"
                      @click="openCreateTask(group.data.id)">
                <Plus class="h-3 w-3 mr-1"/>
                添加
              </Button>
            </div>
          </div>

          <div class="w-2 shrink-0"></div>
        </div>

        <div v-else class="h-full overflow-y-auto custom-scroll">
          <div class="container max-w-4xl mx-auto p-6 space-y-3">
            <TransitionGroup name="list">
              <Card v-for="task in flatFilteredTasks" :key="task.id"
                    class="group transition-all duration-200 border-border/60 hover:border-border hover:shadow-sm cursor-pointer"
                    :class="[
                  task.completed ? 'opacity-60 bg-muted/10 border-dashed shadow-none' : 'bg-card',
                  isUrgent(task) ? 'border-amber-500/40' : ''
                ]"
                    @click="editTaskForm(task)"
              >
                <CardContent class="p-4 flex flex-col gap-2.5">

                  <div class="flex items-start justify-between gap-4">
                    <div class="flex items-start gap-3 flex-1 min-w-0">
                      <button
                          class="mt-0.5 shrink-0 focus:outline-none text-muted-foreground hover:text-primary transition-colors"
                          @click.stop="toggleTaskStatus(task.id)">
                        <CheckCircle2 v-if="task.completed" class="h-5 w-5"/>
                        <Circle v-else class="h-5 w-5"/>
                      </button>
                      <div class="flex flex-col min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <OverflowTooltipText
                              tag="span"
                              :class-name="[
                                'font-medium text-sm leading-snug max-w-[380px] truncate',
                                { 'line-through text-muted-foreground': task.completed }
                              ]"
                              :text="task.title"
                            />
                          <Badge v-if="task.priority !== 'none'" variant="outline" class="text-[10px] px-1.5 h-4 border"
                                 :class="getPriorityStyles(task.priority)">
                            {{ task.priority }}
                          </Badge>
                        </div>
                        <OverflowTooltipText
                          v-if="task.desc"
                          tag="p"
                          class-name="text-xs text-muted-foreground/80 truncate mt-0.5 md:line-clamp-2 md:whitespace-normal"
                          :text="task.desc"
                        />
                      </div>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                      <div v-if="isUrgent(task)"
                           class="inline-flex items-center gap-1 text-amber-600 text-[10px] font-medium">
                        <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                        紧急
                      </div>
                      <span v-if="task.dueDate"
                            class="inline-flex items-center text-[10px] text-muted-foreground px-1 py-0.5 rounded">
                          <CalendarIcon class="h-3 w-3 mr-1.5 opacity-70"/> {{ formatSimpleDate(task.dueDate) }}
                       </span>
                    </div>
                  </div>

                  <div class="flex items-center justify-between pl-8 mt-0.5 pt-2 border-t border-border/30">
                    <div class="flex items-center gap-4 overflow-hidden">
                      <div v-if="task.projectId && findProjectById(task.projectId)"
                           class="flex items-center text-[11px] text-muted-foreground min-w-0">
                        <Folder class="h-3.5 w-3.5 mr-1.5"/>
                        <OverflowTooltipText
                          tag="span"
                          class-name="truncate max-w-[140px]"
                          :text="findProjectById(task.projectId)?.title || ''"
                        />
                      </div>

                      <div v-if="task.taskType || task.contact"
                           class="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
                           <span v-if="task.taskType"
                                 class="text-[11px] text-muted-foreground whitespace-nowrap">
                             {{ task.taskType }}
                           </span>
                           <span v-if="task.taskType && task.contact" class="text-muted-foreground/60 text-[11px]">·</span>
                           <OverflowTooltipText
                             v-if="task.contact"
                             tag="span"
                             class-name="text-[11px] text-muted-foreground whitespace-nowrap max-w-[220px] truncate inline-block"
                             :text="`联系人: ${task.contact}`"
                           />
                      </div>
                    </div>

                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                      <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-foreground"
                              @click.stop="editTaskForm(task)">
                        <PenSquare class="h-3.5 w-3.5"/>
                      </Button>
                      <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive"
                              @click.stop="handleSoftDeleteTask(task.id)">
                        <Trash2 class="h-3.5 w-3.5"/>
                      </Button>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TransitionGroup>

            <div v-if="flatFilteredTasks.length === 0"
                 class="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
              <LayoutDashboard class="h-12 w-12 mb-3 stroke-[1.5]"/>
              <p class="text-sm font-medium">暂无任务</p>
              <Button variant="link" class="text-xs mt-2" @click="openCreateTask()">去创建一个</Button>
            </div>
          </div>
        </div>

      </div>
    </main>

    <CompletedProjectsDialog
      v-model:open="showCompletedModal"
      :completed-projects-list="completedProjectsList"
      :format-simple-date="formatSimpleDate"
      @unarchive="unarchiveProject"
      @delete-project="handleDeleteProject"
    />

    <ProjectManagementDialog
      v-model:open="showProjectModal"
      :active-projects="activeProjects"
      :project-form="projectForm"
      :project-type-options="PROJECT_TYPE_OPTIONS"
      :event-type-options="EVENT_TYPE_OPTIONS"
      :project-status-options="PROJECT_STATUS_OPTIONS"
      :business-line-first="BUSINESS_LINE_FIRST"
      :business-line-second="BUSINESS_LINE_SECOND"
      :get-project-status-style="getProjectStatusStyle"
      :get-project-status-label="getProjectStatusLabel"
      @edit-project="editProjectForm"
      @delete-project="handleDeleteProject"
      @reset-form="resetProjectForm"
      @submit="handleProjectSubmit"
    />

    <TaskFormDialog
      v-model:open="showTaskModal"
      :editing-id="editingId"
      :form="form"
      :selectable-projects-list="selectableProjectsList"
      :task-type-options="TASK_TYPE_OPTIONS"
      @submit="handleTaskSubmit"
    />

    <TrashDialog
      v-model:open="showTrashModal"
      v-model:trash-view-mode="trashViewMode"
      :trash-tasks="trashTasks"
      :trash-projects="trashProjects"
      @restore-task="handleRestoreTask"
      @delete-task="handlePermanentDeleteTask"
      @restore-project="restoreProject"
      @delete-project="handlePermanentDeleteProject"
      @empty-trash="handleEmptyTrash"
    />

    <Transition name="slide-up">
      <div v-if="notification.show"
           class="fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-2xl border bg-foreground text-background text-sm font-medium flex items-center gap-3 z-[60]">
        <AlertCircle v-if="notification.type === 'error'" class="h-4 w-4 text-red-400"/>
        <CheckCircle2 v-else class="h-4 w-4 text-emerald-400"/>
        {{ notification.message }}
      </div>
    </Transition>
    </TooltipProvider>
  </div>
</template>

<style>
.list-enter-active, .list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from, .list-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-2px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(2px);
  }
}

.animate-shake {
  animation: shake 0.6s cubic-bezier(.36, .07, .19, .97) both;
}

.custom-scroll {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.custom-scroll::-webkit-scrollbar {
  height: 8px;
  width: 6px;
}

.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scroll::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.custom-scroll:hover {
  scrollbar-color: #d4d4d8 transparent;
}

.custom-scroll:hover::-webkit-scrollbar-thumb {
  background-color: #d4d4d8;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
