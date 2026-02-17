<script setup>
import { AlertTriangle, Calendar as CalendarIcon, CheckCircle2, Circle, Folder, LayoutDashboard, PenSquare, Trash2 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { OverflowTooltipText } from '@/components/ui/tooltip';

defineProps({
  flatFilteredTasks: { type: Array, default: () => [] },
  findProjectById: { type: Function, required: true },
  isUrgent: { type: Function, required: true },
  getPriorityStyles: { type: Function, required: true },
  formatSimpleDate: { type: Function, required: true }
});

const emit = defineEmits(['toggle-task-status', 'edit-task', 'soft-delete-task', 'open-create-task']);
</script>

<template>
  <div class="h-full overflow-y-auto custom-scroll">
    <div class="container max-w-4xl mx-auto p-6 space-y-3">
      <TransitionGroup name="list">
        <Card
          v-for="task in flatFilteredTasks"
          :key="task.id"
          class="group transition-all duration-200 border-border/60 hover:border-border hover:shadow-sm cursor-pointer"
          :class="[
            task.completed ? 'opacity-60 bg-muted/10 border-dashed shadow-none' : 'bg-card',
            isUrgent(task) ? 'border-amber-500/40' : ''
          ]"
          @click="emit('edit-task', task)"
        >
          <CardContent class="p-4 flex flex-col gap-2.5">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <button class="mt-0.5 shrink-0 focus:outline-none text-muted-foreground hover:text-primary transition-colors" @click.stop="emit('toggle-task-status', task.id)">
                  <CheckCircle2 v-if="task.completed" class="h-5 w-5" />
                  <Circle v-else class="h-5 w-5" />
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
                    <Badge v-if="task.priority !== 'none'" variant="outline" class="text-[10px] px-1.5 h-4 border" :class="getPriorityStyles(task.priority)">
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
                <div v-if="isUrgent(task)" class="inline-flex items-center gap-1 text-amber-600 text-[10px] font-medium">
                  <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  紧急
                </div>
                <span v-if="task.dueDate" class="inline-flex items-center text-[10px] text-muted-foreground px-1 py-0.5 rounded">
                  <CalendarIcon class="h-3 w-3 mr-1.5 opacity-70" /> {{ formatSimpleDate(task.dueDate) }}
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between pl-8 mt-0.5 pt-2 border-t border-border/30">
              <div class="flex items-center gap-4 overflow-hidden">
                <div v-if="task.projectId && findProjectById(task.projectId)" class="flex items-center text-[11px] text-muted-foreground min-w-0">
                  <Folder class="h-3.5 w-3.5 mr-1.5" />
                  <OverflowTooltipText tag="span" class-name="truncate max-w-[140px]" :text="findProjectById(task.projectId)?.title || ''" />
                </div>

                <div v-if="task.taskType || task.contact" class="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
                  <span v-if="task.taskType" class="text-[11px] text-muted-foreground whitespace-nowrap">
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
                <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-foreground" @click.stop="emit('edit-task', task)">
                  <PenSquare class="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive" @click.stop="emit('soft-delete-task', task.id)">
                  <Trash2 class="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TransitionGroup>

      <div v-if="flatFilteredTasks.length === 0" class="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
        <LayoutDashboard class="h-12 w-12 mb-3 stroke-[1.5]" />
        <p class="text-sm font-medium">暂无任务</p>
        <Button variant="link" class="text-xs mt-2" @click="emit('open-create-task')">去创建一个</Button>
      </div>
    </div>
  </div>
</template>
