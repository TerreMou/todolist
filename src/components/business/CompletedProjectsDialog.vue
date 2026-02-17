<script setup>
import { RotateCcw, Trash2, Folder } from 'lucide-vue-next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

defineProps({
  open: { type: Boolean, required: true },
  completedProjectsList: { type: Array, required: true },
  formatSimpleDate: { type: Function, required: true }
});

const emit = defineEmits(['update:open', 'unarchive', 'delete-project']);
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>已完成项目</DialogTitle>
        <DialogDescription>这里展示所有状态为“已完成”的项目。</DialogDescription>
      </DialogHeader>
      <div class="space-y-3 my-4 max-h-[300px] overflow-y-auto pr-2 custom-scroll">
        <div v-if="completedProjectsList.length === 0" class="text-center py-8 text-sm text-muted-foreground">
          没有已完成的项目
        </div>
        <div
          v-for="proj in completedProjectsList"
          :key="proj.id"
          class="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
        >
          <div class="flex flex-col gap-1">
            <span class="font-medium text-sm flex items-center gap-2">
              <Folder class="h-4 w-4 text-muted-foreground" /> {{ proj.title }}
              <Badge variant="outline" class="text-[10px] bg-green-50 text-green-700 border-green-200">已完成</Badge>
            </span>
            <span class="text-[10px] text-muted-foreground">
              {{ proj.startDate ? formatSimpleDate(proj.startDate) : '...' }} -> {{ proj.endDate ? formatSimpleDate(proj.endDate) : '...' }}
            </span>
          </div>
          <div class="flex gap-2">
            <Button size="sm" variant="outline" class="h-7 text-xs" @click="emit('unarchive', proj.id)">
              <RotateCcw class="mr-1 h-3 w-3" />
              撤销
            </Button>
            <Button
              size="sm"
              variant="ghost"
              class="h-7 text-xs text-destructive hover:bg-destructive/10"
              @click="emit('delete-project', proj.id)"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="emit('update:open', false)">关闭</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
