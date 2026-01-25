<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import {
  Trash2, Plus, Calendar as CalendarIcon, CheckCircle2, Circle, Search,
  LayoutDashboard, PenSquare, Clock, AlertTriangle, AlertCircle, PieChart,
  ListFilter, X, Check, Filter
} from 'lucide-vue-next';
import { format, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
// 🟢 新增：引入 Reka UI 需要的日期解析工具
import { parseDate } from '@internationalized/date';

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import JoLogo from '@/components/JoLogo.vue';

// --- 常量定义 ---
const STORAGE_KEY = 'jos-todo-list-data';
const CATEGORY_OPTIONS = ['MKT', 'Event', 'Payment', 'Others'];
const TRASH_RETENTION_DAYS = 30;
const NOTIFICATION_DURATION = 3000;
const DEFAULT_TIME = '12:00';

// 优先级样式配置
const PRIORITY_STYLES_CONFIG = {
  high: 'border-red-500/30 bg-red-100 text-red-700 hover:bg-red-200',
  medium: 'border-orange-500/30 bg-orange-100 text-orange-700 hover:bg-orange-200',
  low: 'border-blue-500/30 bg-blue-100 text-blue-700 hover:bg-blue-200',
  none: 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
};

// --- 状态定义 ---
const tasks = ref([]);
const editingId = ref(null);
const showTrashModal = ref(false);

const form = ref({
  title: '',
  desc: '',
  priority: 'low',
  date: undefined,
  time: DEFAULT_TIME,
  categories: []
});

const searchQuery = ref('');
const filterStatus = ref('all');
const filterCategories = ref([]);
const notification = ref({ show: false, message: '', type: 'success' });

// --- 工具函数 ---

/** 解析日期和时间为 ISO 字符串 */
const combineDateTime = () => {
  if (!form.value.date) return '';
  const dateStr = form.value.date.toString();
  const date = new Date(dateStr);
  const [hours, minutes] = form.value.time.split(':');
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toISOString();
};

/** 从 ISO 日期字符串提取时间 */
const extractTimeFromISO = (isoString) => {
  const dateObj = new Date(isoString);
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/** 从 ISO 日期字符串提取日期为 CalendarDate */
const extractDateFromISO = (isoString) => {
  try {
    const isoDateStr = isoString.split('T')[0];
    return parseDate(isoDateStr);
  } catch (e) {
    console.error('日期解析失败', e);
    return undefined;
  }
};

/** 格式化日期为可读字符串 */
const formatDate = (iso) => iso ? format(new Date(iso), 'MMM do HH:mm', { locale: zhCN }) : '';

/** 获取任务剩余时间 */
const getRemainingTime = (iso) => {
  if (!iso) return '';
  const diff = new Date(iso) - new Date();
  if (diff < 0) return '已过期';
  const days = Math.floor(diff / (86400000));
  return days > 0 ? `${days}天` : '即将到期';
};

/** 判断任务是否紧急（≤3 天且未完成） */
const isUrgent = (task) => {
  if (task.completed || !task.dueDate) return false;
  const due = new Date(task.dueDate);
  const now = new Date();
  const diff = differenceInDays(due, now);
  return due > now && diff <= 3 && diff >= -1;
};

/** 获取优先级的样式类名 */
const getPriorityStyles = (priority) => PRIORITY_STYLES_CONFIG[priority] || PRIORITY_STYLES_CONFIG.none;

/** 验证任务标题 */
const validateTaskTitle = (title) => {
  if (!title.trim()) {
    showNotification('请输入任务标题', 'error');
    return false;
  }
  return true;
};

/** 验证截止时间（新建时不允许过期） */
const validateDueDate = (dueDate, isEditing) => {
  if (dueDate && new Date(dueDate) < new Date() && !isEditing) {
    showNotification('截止时间无效', 'error');
    return false;
  }
  return true;
};

/** 显示通知 */
const showNotification = (msg, type = 'success') => {
  notification.value = { show: true, message: msg, type };
  setTimeout(() => notification.value.show = false, NOTIFICATION_DURATION);
};

// --- 核心逻辑 ---

const saveToLocalStorage = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.value));
};

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      tasks.value = parsed.map(t => ({
        ...t,
        categories: Array.isArray(t.categories) ? t.categories : []
      }));
    } catch (e) {
      console.error('数据读取失败', e);
      tasks.value = [];
    }
  }
  // 自动清理超过 30 天的删除项
  const thirtyDaysAgo = Date.now() - (TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  tasks.value = tasks.value.filter(t => !t.isDeleted || (t.isDeleted && new Date(t.deletedAt).getTime() > thirtyDaysAgo));
});

watch(tasks, saveToLocalStorage, { deep: true });

const activeTasks = computed(() => tasks.value.filter(t => !t.isDeleted));
const trashTasks = computed(() => tasks.value.filter(t => t.isDeleted));

const stats = computed(() => {
  const total = activeTasks.value.length;
  const completed = activeTasks.value.filter(t => t.completed).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, progress };
});

// 列表排序与过滤
const filteredTasks = computed(() => {
  let result = activeTasks.value;

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(t => t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query));
  }

  if (filterStatus.value === 'active') result = result.filter(t => !t.completed);
  else if (filterStatus.value === 'completed') result = result.filter(t => t.completed);

  if (filterCategories.value.length > 0) {
    result = result.filter(t =>
      t.categories && t.categories.some(c => filterCategories.value.includes(c))
    );
  }

  // 排序：已完成的最后，然后是紧急任务，再按优先级，最后按截止日期
  return result.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    if (!a.completed && !b.completed) {
      const urgentA = isUrgent(a);
      const urgentB = isUrgent(b);
      if (urgentA !== urgentB) return urgentA ? -1 : 1;
    }

    const priorityMap = { high: 3, medium: 2, low: 1, none: 0 };
    if (priorityMap[a.priority] !== priorityMap[b.priority]) {
      return priorityMap[b.priority] - priorityMap[a.priority];
    }

    return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
  });
});

const handleSubmit = () => {
  if (!validateTaskTitle(form.value.title)) return;

  const finalDueDate = combineDateTime();
  if (!validateDueDate(finalDueDate, !!editingId.value)) return;

  const safeCategories = form.value.categories ? [...form.value.categories] : [];

  const taskData = {
    title: form.value.title,
    desc: form.value.desc,
    priority: form.value.priority,
    dueDate: finalDueDate,
    categories: safeCategories
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
  resetForm();
};

// 🟢 核心修复：编辑任务逻辑
const editTask = (task) => {
  const dateObj = task.dueDate ? extractDateFromISO(task.dueDate) : undefined;
  const timeStr = task.dueDate ? extractTimeFromISO(task.dueDate) : DEFAULT_TIME;

  form.value = {
    title: task.title,
    desc: task.desc,
    priority: task.priority,
    date: dateObj,
    time: timeStr,
    categories: Array.isArray(task.categories) ? [...task.categories] : []
  };
  editingId.value = task.id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 筛选器逻辑
const toggleFilterCategory = (cat) => {
  const index = filterCategories.value.indexOf(cat);
  if (index === -1) {
    filterCategories.value.push(cat);
  } else {
    filterCategories.value.splice(index, 1);
  }
};

const removeFilterCategory = (cat) => {
  filterCategories.value = filterCategories.value.filter(c => c !== cat);
};

// 类别管理
const handleCategoryChange = (cat, isChecked) => {
  if (!Array.isArray(form.value.categories)) form.value.categories = [];

  let newCategories = [...form.value.categories];

  if (isChecked) {
    if (!newCategories.includes(cat)) {
      newCategories.push(cat);
    }
  } else {
    newCategories = newCategories.filter(item => item !== cat);
  }

  form.value.categories = newCategories;
};

// 任务操作
const toggleStatus = (id) => {
  const task = tasks.value.find(t => t.id === id);
  if (task) task.completed = !task.completed;
};

const softDelete = (id) => {
  const task = tasks.value.find(t => t.id === id);
  if (task) {
    task.isDeleted = true;
    task.deletedAt = new Date().toISOString();
    showNotification('已移至回收站');
  }
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
  tasks.value = tasks.value.filter(t => !t.isDeleted);
  showNotification('回收站已清空');
};

const resetForm = () => {
  form.value = {
    title: '',
    desc: '',
    priority: 'low',
    date: undefined,
    time: DEFAULT_TIME,
    categories: []
  };
  editingId.value = null;
};
</script>

<template>
  <div class="min-h-screen bg-background text-foreground pb-12 font-sans selection:bg-primary selection:text-primary-foreground">

    <header class="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div class="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div class="flex items-center gap-3">
          <JoLogo class="h-8 w-8 sm:h-9 sm:w-9 shrink-0 mr-1" />
          <span class="font-bold text-lg tracking-tight">Jo's <span class="text-muted-foreground">TodoList</span></span>
        </div>

        <Button variant="ghost" size="icon" @click="showTrashModal = true" class="relative hover:bg-muted">
          <Trash2 class="h-5 w-5 text-muted-foreground transition-colors" />
          <Badge v-if="trashTasks.length" variant="destructive" class="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[10px]">
            {{ trashTasks.length }}
          </Badge>
        </Button>
      </div>
    </header>

    <main class="container max-w-5xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">

      <div class="lg:col-span-4 space-y-6">
        <Card class="sticky top-24 border-border shadow-sm">
          <CardHeader class="pb-3">
            <CardTitle class="text-lg font-semibold tracking-tight">{{ editingId ? '编辑任务' : '新增待办' }}</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">任务内容</Label>
              <Input v-model="form.title" placeholder="要做什么？" class="bg-muted/30 focus-visible:ring-1" />
            </div>

            <div class="space-y-2">
              <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">备注</Label>
              <Textarea v-model="form.desc" placeholder="细节..." class="resize-none bg-muted/30 focus-visible:ring-1" rows="3" />
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

            <div class="grid grid-cols-1 gap-4">
              <div class="space-y-2">
                <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">优先级</Label>
                <Select v-model="form.priority">
                  <SelectTrigger class="bg-muted/30">
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

              <div class="space-y-2">
                <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">截止时间</Label>
                <Popover>
                  <PopoverTrigger as-child>
                    <Button variant="outline" class="w-full justify-start text-left font-normal bg-muted/30 border-input h-10 px-3 overflow-hidden" :class="!form.date ? 'text-muted-foreground' : ''">
                      <CalendarIcon class="mr-2 h-4 w-4 shrink-0" />
                      <span v-if="form.date" class="truncate">
                        {{ form.date ? format(new Date(form.date.toString()), "yyyy-MM-dd") : '' }} {{ form.time }}
                      </span>
                      <span v-else>选择日期</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar v-model="form.date" mode="single" initial-focus />
                    <div class="p-3 border-t border-border flex items-center gap-2">
                      <Clock class="h-4 w-4 text-muted-foreground" />
                      <input type="time" v-model="form.time" class="flex-1 bg-transparent text-sm focus:outline-none font-mono cursor-pointer" />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
          <CardFooter class="flex gap-2 pt-2">
            <Button class="w-full font-medium" @click="handleSubmit">
              <Plus v-if="!editingId" class="mr-2 h-4 w-4" />
              {{ editingId ? '保存' : '添加' }}
            </Button>
            <Button v-if="editingId" variant="outline" @click="resetForm">取消</Button>
          </CardFooter>
        </Card>
      </div>

      <div class="lg:col-span-8 space-y-4">

        <div class="flex items-center gap-4 bg-muted/30 p-3 rounded-lg border border-border/50">
          <div class="flex items-center gap-2">
            <PieChart class="h-4 w-4 text-muted-foreground" />
            <span class="text-xs font-medium text-muted-foreground">今日进度</span>
          </div>
          <div class="flex-1 h-2 bg-muted rounded-full overflow-hidden">
             <div class="h-full bg-primary transition-all duration-1000 ease-out" :style="{ width: `${stats.progress}%` }"></div>
          </div>
          <span class="text-xs font-mono font-bold">{{ stats.progress }}%</span>
        </div>

        <div class="flex flex-col gap-3">

          <div class="flex flex-col sm:flex-row gap-3 items-center">
            <div class="relative w-full flex-1">
              <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input v-model="searchQuery" placeholder="搜索任务..." class="pl-9 bg-background focus-visible:ring-1 h-9" />
            </div>

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
                      <CommandItem
                        v-for="cat in CATEGORY_OPTIONS"
                        :key="cat"
                        :value="cat"
                        @select="toggleFilterCategory(cat)"
                      >
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
                        <CommandItem :value="'clear'" class="justify-center text-center" @select="filterCategories = []">
                          清除筛选
                        </CommandItem>
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

          <div v-if="filterCategories.length > 0" class="flex flex-wrap gap-2 items-center">
            <span class="text-xs text-muted-foreground font-medium">已选:</span>
            <Badge
              v-for="cat in filterCategories"
              :key="cat"
              variant="secondary"
              class="h-7 px-2 text-xs font-normal border-primary/20 bg-background hover:bg-muted cursor-pointer flex items-center gap-1"
              @click="removeFilterCategory(cat)"
            >
              {{ cat }}
              <X class="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              class="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              @click="filterCategories = []"
            >
              清除全部
            </Button>
          </div>

        </div>

        <div class="space-y-3 pb-12">
          <TransitionGroup name="list">
            <Card v-for="task in filteredTasks" :key="task.id"
              class="group transition-all duration-200"
              :class="[
                task.completed ? 'opacity-50 bg-muted/20 border-transparent shadow-none' : 'bg-card',
                isUrgent(task) ? 'border-amber-500/50 bg-amber-50/10 shadow-sm animate-shake' : 'hover:border-foreground/20'
              ]">
              <CardContent class="p-4 flex gap-4 items-start relative">

                <div v-if="isUrgent(task)" class="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-1 shadow-sm z-10">
                   <AlertTriangle class="h-3 w-3" />
                </div>

                <button class="mt-0.5 shrink-0 focus:outline-none" @click="toggleStatus(task.id)">
                  <CheckCircle2 v-if="task.completed" class="h-5 w-5 text-muted-foreground" />
                  <Circle v-else class="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                <div class="flex-1 min-w-0">
                  <div class="flex flex-col gap-1 mb-1">
                    <div class="flex justify-between items-start">
                        <h3 class="font-medium text-sm sm:text-base mr-2 break-all" :class="{'line-through text-muted-foreground': task.completed}">
                          {{ task.title }}
                        </h3>
                        <Badge v-if="task.priority !== 'none'" variant="outline" class="shrink-0 text-[10px] uppercase px-2 py-0.5 rounded-md h-5 border font-semibold shadow-sm" :class="getPriorityStyles(task.priority)">
                          {{ task.priority }}
                        </Badge>
                    </div>

                    <div v-if="task.categories && task.categories.length > 0" class="flex flex-wrap gap-1.5 mt-0.5">
                      <Badge v-for="cat in task.categories" :key="cat" variant="outline" class="text-[10px] px-2 py-0 h-5 font-medium border-primary/20 text-primary/80 bg-primary/5">
                        {{ cat }}
                      </Badge>
                    </div>
                  </div>

                  <p v-if="task.desc" class="text-xs text-muted-foreground line-clamp-2 font-light mt-1.5">{{ task.desc }}</p>

                  <div class="flex justify-between items-center mt-3 h-5">
                    <div class="text-[10px] flex items-center gap-2 font-mono" :class="isUrgent(task) ? 'text-amber-600 font-bold' : 'text-muted-foreground'">
                       <span v-if="task.dueDate" class="flex items-center">
                         <CalendarIcon class="h-3 w-3 mr-1 opacity-70" />
                         {{ formatDate(task.dueDate) }}
                         <span v-if="isUrgent(task)" class="ml-2">即将到期</span>
                       </span>
                    </div>

                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" class="h-6 w-6" @click="editTask(task)">
                        <PenSquare class="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-destructive/10" @click="softDelete(task.id)">
                        <Trash2 class="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TransitionGroup>

          <div v-if="filteredTasks.length === 0" class="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
            <LayoutDashboard class="h-10 w-10 mb-3 stroke-1 opacity-50" />
            <p class="text-sm font-medium">没有找到任务</p>
          </div>
        </div>
      </div>

    </main>

    <Dialog v-model:open="showTrashModal">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>回收站</DialogTitle>
          <DialogDescription>30天内删除的任务。</DialogDescription>
        </DialogHeader>
        <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-2 my-2">
          <div v-if="trashTasks.length === 0" class="text-center py-8 text-sm text-muted-foreground">空</div>
          <div v-for="task in trashTasks" :key="task.id" class="flex items-center justify-between p-3 border rounded-md bg-muted/20">
            <span class="text-sm line-through text-muted-foreground truncate max-w-[200px]">{{ task.title }}</span>
            <div class="flex gap-2">
               <Button size="sm" variant="outline" class="h-7 text-xs" @click="restoreTask(task.id)">恢复</Button>
               <Button size="sm" variant="ghost" class="h-7 text-xs text-destructive hover:bg-destructive/10" @click="permanentDelete(task.id)">彻底删除</Button>
            </div>
          </div>
        </div>
        <DialogFooter class="sm:justify-between flex-row items-center pt-2">
          <span class="text-xs text-muted-foreground">自动清理</span>
          <Button v-if="trashTasks.length" variant="destructive" size="sm" @click="emptyTrash">清空</Button>
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
</style>