<script setup>
import { ArchiveRestore, Calendar as CalendarIcon, CheckCircle2, Circle, Folder, MoreHorizontal, PenSquare, Plus, Trash2, AlertTriangle, Grip } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { OverflowTooltipText } from '@/components/ui/tooltip';

defineProps({
  groupedTasks: { type: Array, default: () => [] },
  isSortingMode: { type: Boolean, default: false },
  projectTypeOptions: { type: Array, default: () => [] },
  eventTypeOptions: { type: Array, default: () => [] },
  getProjectStatusStyle: { type: Function, required: true },
  getProjectStatusLabel: { type: Function, required: true },
  formatSimpleDate: { type: Function, required: true },
  isUrgent: { type: Function, required: true },
  getPriorityStyles: { type: Function, required: true }
});

const emit = defineEmits([
  'open-create-task',
  'edit-project',
  'delete-project',
  'toggle-task-status',
  'edit-task',
  'soft-delete-task'
]);
</script>

<template>
  <div class="kanban-container flex-1 w-full h-full overflow-x-auto flex gap-6 p-6 items-start custom-scroll">
    <div
      v-for="group in groupedTasks"
      :key="group.data.id"
      :data-project-id="group.type === 'project' ? group.data.id : null"
      class="w-[300px] shrink-0 flex flex-col max-h-full bg-muted/30 rounded-xl border min-h-0 transition-all"
      :class="{ 'cursor-grab active:cursor-grabbing': isSortingMode && group.type === 'project' }"
    >
      <div class="p-3 border-b flex flex-col gap-2 shrink-0 bg-muted/10 rounded-t-xl z-10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <component
              :is="isSortingMode && group.type === 'project' ? Grip : (group.type === 'project' ? Folder : ArchiveRestore)"
              class="h-4 w-4 text-muted-foreground flex-shrink-0 hover:text-foreground transition-colors"
            />
            <OverflowTooltipText tag="h3" class-name="font-semibold text-sm truncate max-w-[140px]" :text="group.data.title" />

            <Badge
              v-if="group.type === 'project'"
              variant="outline"
              class="text-[10px] px-1 py-0 h-4 whitespace-nowrap bg-background"
              :class="getProjectStatusStyle(group.data.status)"
            >
              {{ getProjectStatusLabel(group.data.status) }}
            </Badge>

            <span class="text-xs text-muted-foreground ml-1">{{ group.tasks.length }}</span>
          </div>

          <div class="flex items-center gap-1">
            <Button v-if="group.data.status !== 'completed'" variant="ghost" size="icon" class="h-7 w-7" @click="emit('open-create-task', group.data.id)">
              <Plus class="h-4 w-4" />
            </Button>

            <DropdownMenu v-if="group.type === 'project'">
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" class="h-7 w-7">
                  <MoreHorizontal class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="emit('edit-project', group.data)">
                  <PenSquare class="mr-2 h-4 w-4" />
                  编辑项目
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem class="text-destructive focus:text-destructive" @click="emit('delete-project', group.data.id)">
                  <Trash2 class="mr-2 h-4 w-4" />
                  删除项目
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div v-if="group.type === 'project' && (group.data.projectType || group.data.eventType || group.data.businessLine)" class="flex gap-2">
          <Badge v-if="group.data.projectType" variant="secondary" class="text-[10px] px-2 py-0.5 h-5">
            {{ projectTypeOptions.find(t => t.value === group.data.projectType)?.label || group.data.projectType }}
          </Badge>
          <Badge v-if="group.data.eventType" variant="secondary" class="text-[10px] px-2 py-0.5 h-5">
            {{ eventTypeOptions.find(e => e.value === group.data.eventType)?.label || group.data.eventType }}
          </Badge>
          <Badge v-if="group.data.businessLine" variant="secondary" class="text-[10px] px-2 py-0.5 h-5 font-semibold">
            {{ group.data.businessLine }}
          </Badge>
        </div>

        <div v-if="group.data.desc" class="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {{ group.data.desc }}
        </div>

        <div v-if="group.data.startDate || group.data.endDate" class="text-xs text-muted-foreground flex items-center gap-1">
          <CalendarIcon class="h-3 w-3 opacity-70" />
          <span v-if="group.data.startDate && group.data.endDate">
            {{ formatSimpleDate(group.data.startDate) }} - {{ formatSimpleDate(group.data.endDate) }}
          </span>
          <span v-else-if="group.data.startDate">开始: {{ formatSimpleDate(group.data.startDate) }}</span>
          <span v-else-if="group.data.endDate">结束: {{ formatSimpleDate(group.data.endDate) }}</span>
        </div>

        <div class="flex items-center gap-2 h-1.5" :class="group.progress > 0 ? 'opacity-100' : 'opacity-0'">
          <div class="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div class="h-full bg-primary transition-all duration-500" :style="{ width: `${group.progress}%` }"></div>
          </div>
        </div>
      </div>

      <div class="p-3 flex-1 overflow-y-auto min-h-0 space-y-3 custom-scroll">
        <TransitionGroup name="list">
          <Card
            v-for="task in group.tasks"
            :key="task.id"
            class="group transition-all duration-200 border-border/60 hover:border-primary/30 hover:shadow-md cursor-default"
            :class="[
              task.completed ? 'opacity-50 bg-muted/20 border-transparent shadow-none' : 'bg-card',
              isUrgent(task) ? 'border-amber-500/50 bg-amber-50/10 shadow-sm animate-shake' : ''
            ]"
          >
            <CardContent class="p-3 relative">
              <div v-if="isUrgent(task)" class="absolute top-2 right-2 text-amber-500">
                <AlertTriangle class="h-3 w-3" />
              </div>
              <div class="flex gap-2 items-start">
                <button class="mt-0.5 shrink-0 focus:outline-none z-10" @click.stop="emit('toggle-task-status', task.id)">
                  <CheckCircle2 v-if="task.completed" class="h-4 w-4 text-muted-foreground" />
                  <Circle v-else class="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
                    <Badge v-if="task.priority !== 'none'" variant="outline" class="text-[10px] px-1 py-0 h-4 border" :class="getPriorityStyles(task.priority)">
                      {{ task.priority }}
                    </Badge>
                    <span v-if="task.taskType" class="text-[10px] text-muted-foreground bg-muted px-1 rounded-sm border border-border/50">
                      {{ task.taskType }}
                    </span>
                  </div>

                  <div class="flex items-center gap-2 pt-1 min-w-0">
                    <span v-if="task.dueDate" class="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CalendarIcon class="h-3 w-3 opacity-70" /> {{ formatSimpleDate(task.dueDate) }}
                    </span>
                    <OverflowTooltipText
                      v-if="task.contact"
                      tag="span"
                      class-name="min-w-0 flex-1 truncate text-[10px] text-muted-foreground"
                      :text="`联系人: ${task.contact}`"
                    />

                    <div class="shrink-0 flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-muted text-muted-foreground" title="编辑" @click.stop="emit('edit-task', task)">
                        <PenSquare class="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-6 w-6 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title="删除"
                        @click.stop="emit('soft-delete-task', task.id)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TransitionGroup>

        <Button
          v-if="group.data.status !== 'completed'"
          variant="ghost"
          class="w-full text-xs text-muted-foreground border border-dashed border-border/60 hover:bg-background h-8"
          @click="emit('open-create-task', group.data.id)"
        >
          <Plus class="h-3 w-3 mr-1" />
          添加
        </Button>
      </div>
    </div>

    <div class="w-2 shrink-0"></div>
  </div>
</template>
