<script setup>
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import EnhancedDatePicker from '@/components/EnhancedDatePicker.vue';

const props = defineProps({
  open: { type: Boolean, required: true },
  editingId: { type: [Number, String, null], default: null },
  form: { type: Object, required: true },
  selectableProjectsList: { type: Array, required: true },
  taskTypeOptions: { type: Array, required: true }
});

const emit = defineEmits(['update:open', 'submit']);
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-[calc(100vw-1.25rem)] sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{{ editingId ? '编辑任务' : '新建任务' }}</DialogTitle>
        <DialogDescription class="sr-only">Task Form</DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">任务内容 *</Label>
          <Input v-model="props.form.title" placeholder="请输入任务内容" />
        </div>

        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">备注</Label>
          <Textarea v-model="props.form.desc" class="resize-none" rows="3" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">所属项目</Label>
            <Select v-model="props.form.projectId">
              <SelectTrigger><SelectValue placeholder="选择项目" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in selectableProjectsList" :key="p.id" :value="p.id">📁 {{ p.title }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">优先级</Label>
            <Select v-model="props.form.priority">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">
                  <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-red-500"></div>High</div>
                </SelectItem>
                <SelectItem value="medium">
                  <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-orange-500"></div>Medium</div>
                </SelectItem>
                <SelectItem value="low">
                  <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-blue-500"></div>Low</div>
                </SelectItem>
                <SelectItem value="none">
                  <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-slate-300"></div>None</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">截止日期</Label>
          <EnhancedDatePicker v-model="props.form.date" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">类型</Label>
            <Select v-model="props.form.taskType">
              <SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="type in taskTypeOptions" :key="type" :value="type">{{ type }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground font-medium uppercase tracking-wide">联系人</Label>
            <Input v-model="props.form.contact" placeholder="输入联系人" />
          </div>
        </div>
      </div>

      <DialogFooter class="flex-col-reverse sm:flex-row gap-2">
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button @click="emit('submit')">{{ editingId ? '保存' : '创建' }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
