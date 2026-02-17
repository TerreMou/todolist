<script setup>
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const props = defineProps({
  open: { type: Boolean, required: true },
  trashViewMode: { type: String, required: true },
  trashTasks: { type: Array, required: true },
  trashProjects: { type: Array, required: true }
});

const emit = defineEmits([
  'update:open',
  'update:trashViewMode',
  'restore-task',
  'delete-task',
  'restore-project',
  'delete-project',
  'empty-trash'
]);
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>回收站</DialogTitle>
        <DialogDescription class="sr-only">Trash</DialogDescription>
        <div class="flex bg-muted p-1 rounded-md h-8 items-center w-fit mt-2">
          <Button
            variant="ghost"
            size="sm"
            class="h-6 px-2 text-[10px]"
            :class="trashViewMode === 'tasks' ? 'bg-background shadow-sm' : 'text-muted-foreground'"
            @click="emit('update:trashViewMode', 'tasks')"
          >
            任务
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="h-6 px-2 text-[10px]"
            :class="trashViewMode === 'projects' ? 'bg-background shadow-sm' : 'text-muted-foreground'"
            @click="emit('update:trashViewMode', 'projects')"
          >
            项目
          </Button>
        </div>
      </DialogHeader>
      <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-2 my-2 custom-scroll">
        <div v-if="trashViewMode === 'tasks'">
          <div v-if="trashTasks.length === 0" class="text-center py-8 text-sm text-muted-foreground">空</div>
          <div v-for="task in trashTasks" :key="task.id" class="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
            <span class="text-sm line-through text-muted-foreground truncate max-w-[200px]">{{ task.title }}</span>
            <div class="flex gap-2">
              <Button size="sm" variant="outline" class="h-7 text-xs" @click="emit('restore-task', task.id)">恢复</Button>
              <Button size="sm" variant="ghost" class="h-7 text-xs text-destructive hover:bg-destructive/10" @click="emit('delete-task', task.id)">删除</Button>
            </div>
          </div>
        </div>
        <div v-else>
          <div v-if="trashProjects.length === 0" class="text-center py-8 text-sm text-muted-foreground">空</div>
          <div v-for="proj in trashProjects" :key="proj.id" class="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
            <div class="flex flex-col">
              <span class="text-sm font-medium line-through text-muted-foreground truncate max-w-[200px]">{{ proj.title }}</span>
              <span class="text-[10px] text-muted-foreground">关联任务将一同恢复</span>
            </div>
            <div class="flex gap-2">
              <Button size="sm" variant="outline" class="h-7 text-xs" @click="emit('restore-project', proj.id)">恢复</Button>
              <Button size="sm" variant="ghost" class="h-7 text-xs text-destructive hover:bg-destructive/10" @click="emit('delete-project', proj.id)">删除</Button>
            </div>
          </div>
        </div>
      </div>
      <DialogFooter class="sm:justify-between flex-row items-center pt-2">
        <span class="text-xs text-muted-foreground">30天自动清理</span>
        <Button
          v-if="(trashViewMode === 'tasks' && trashTasks.length) || (trashViewMode === 'projects' && trashProjects.length)"
          variant="destructive"
          size="sm"
          class="h-8 text-xs"
          @click="emit('empty-trash')"
        >
          清空
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
