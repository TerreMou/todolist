<script setup>
import { Folder, PenSquare, Trash2 } from 'lucide-vue-next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import EnhancedDatePicker from '@/components/EnhancedDatePicker.vue';

const props = defineProps({
  open: { type: Boolean, required: true },
  activeProjects: { type: Array, required: true },
  projectForm: { type: Object, required: true },
  projectTypeOptions: { type: Array, required: true },
  eventTypeOptions: { type: Array, required: true },
  projectStatusOptions: { type: Array, required: true },
  businessLineFirst: { type: Array, required: true },
  businessLineSecond: { type: Array, required: true },
  getProjectStatusStyle: { type: Function, required: true },
  getProjectStatusLabel: { type: Function, required: true }
});

const emit = defineEmits([
  'update:open',
  'edit-project',
  'delete-project',
  'reset-form',
  'submit'
]);
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="w-[calc(100vw-24px)] sm:w-auto sm:max-w-[900px] lg:max-w-[1000px] max-h-[calc(100vh-40px)] sm:max-h-[calc(100vh-80px)] flex flex-col overflow-hidden p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle>项目管理</DialogTitle>
        <DialogDescription>创建 or 编辑项目</DialogDescription>
      </DialogHeader>

      <div class="flex-1 overflow-y-auto pr-2 custom-scroll">
        <div class="space-y-2 mb-4">
          <div class="text-sm sm:text-xs text-muted-foreground font-medium px-1 sm:px-2">已有项目</div>
          <div class="max-h-[240px] sm:max-h-[200px] overflow-y-auto pr-1 sm:pr-2 custom-scroll border rounded-lg">
            <div v-if="activeProjects.length === 0" class="text-xs text-muted-foreground text-center py-4">
              还没有项目，创建第一个吧
            </div>
            <div v-else class="min-w-full">
              <div class="sm:hidden p-2 space-y-2">
                <div v-for="p in activeProjects" :key="`${p.id}-mobile`" class="rounded-lg border bg-background p-2.5 space-y-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 space-y-1">
                      <div class="flex items-center gap-2 min-w-0">
                        <Folder class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span class="font-medium text-sm truncate">{{ p.title }}</span>
                      </div>
                      <div class="text-xs text-muted-foreground line-clamp-2">{{ p.desc || '—' }}</div>
                    </div>
                    <Badge variant="outline" class="text-[11px] h-6 px-2 whitespace-nowrap shrink-0" :class="getProjectStatusStyle(p.status)">
                      {{ getProjectStatusLabel(p.status) }}
                    </Badge>
                  </div>
                  <div class="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" class="h-7 w-7" @click="emit('edit-project', p)">
                      <PenSquare class="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" class="h-7 w-7 text-destructive hover:bg-destructive/10" @click="emit('delete-project', p.id)">
                      <Trash2 class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div class="hidden sm:grid sticky top-0 z-10 grid-cols-12 gap-2 p-2 bg-background border-b text-xs font-medium text-muted-foreground shadow-sm">
                <div class="col-span-5">项目名称</div>
                <div class="col-span-4">描述</div>
                <div class="col-span-2">状态</div>
                <div class="col-span-1 text-right">操作</div>
              </div>
              <div
                v-for="p in activeProjects"
                :key="p.id"
                class="hidden sm:grid grid-cols-12 gap-2 p-2 items-center border-b hover:bg-accent/30 transition-colors group"
              >
                <div class="col-span-5 flex items-center gap-2 min-w-0">
                  <Folder class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span class="font-medium text-sm truncate">{{ p.title }}</span>
                </div>
                <div class="col-span-4 text-xs text-muted-foreground truncate">{{ p.desc || '—' }}</div>
                <div class="col-span-2">
                  <Badge variant="outline" class="text-[10px] h-6 px-2 whitespace-nowrap" :class="getProjectStatusStyle(p.status)">
                    {{ getProjectStatusLabel(p.status) }}
                  </Badge>
                </div>
                <div class="col-span-1 flex justify-end gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" class="h-6 w-6" @click="emit('edit-project', p)">
                    <PenSquare class="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" class="h-6 w-6 text-destructive hover:bg-destructive/10" @click="emit('delete-project', p.id)">
                    <Trash2 class="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div class="space-y-4 pt-4 max-h-[500px] overflow-y-auto pr-1 sm:pr-2 custom-scroll">
          <div class="space-y-3">
            <div class="space-y-2">
              <Label class="text-xs text-muted-foreground font-medium">名称</Label>
              <Input v-model="props.projectForm.title" class="h-8" />
            </div>
            <div class="space-y-2">
              <Label class="text-xs text-muted-foreground font-medium">描述</Label>
              <Input v-model="props.projectForm.desc" class="h-8" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div class="space-y-3">
              <div class="space-y-2">
                <Label class="text-xs text-muted-foreground font-medium">项目类型</Label>
                <Select v-model="props.projectForm.projectType">
                  <SelectTrigger class="h-8">
                    <SelectValue placeholder="选择项目类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="t in projectTypeOptions" :key="t.value" :value="t.value">
                      {{ t.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label class="text-xs text-muted-foreground font-medium">活动类型</Label>
                <Select v-model="props.projectForm.eventType">
                  <SelectTrigger class="h-8">
                    <SelectValue placeholder="选择活动类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="e in eventTypeOptions" :key="e.value" :value="e.value">
                      {{ e.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div class="space-y-3">
              <div class="space-y-2">
                <Label class="text-xs text-muted-foreground font-medium">状态</Label>
                <Select v-model="props.projectForm.status">
                  <SelectTrigger class="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="s in projectStatusOptions" :key="s.value" :value="s.value">
                      <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full" :class="s.color.split(' ')[1].replace('text-', 'bg-')"></div>
                        {{ s.label }}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label class="text-xs text-muted-foreground font-medium">时间</Label>
                <div class="flex gap-2 items-center">
                  <EnhancedDatePicker v-model="props.projectForm.startDate" placeholderText="开始" />
                  <span class="text-muted-foreground self-center text-xs">-</span>
                  <EnhancedDatePicker v-model="props.projectForm.endDate" placeholderText="结束" />
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3 border-t pt-3">
            <Label class="text-xs text-muted-foreground font-medium">业务线</Label>
            <div class="flex gap-4 items-start flex-wrap">
              <div class="flex gap-2 flex-wrap">
                <Button
                  v-for="b in businessLineFirst"
                  :key="b.value"
                  :variant="props.projectForm.businessLine.substring(0, 1) === b.value ? 'default' : 'outline'"
                  size="sm"
                  class="h-8 px-3 text-xs"
                  @click="props.projectForm.businessLine = b.value + (props.projectForm.businessLine.substring(1) || '')"
                >
                  {{ b.label }}
                </Button>
              </div>
              <div v-if="props.projectForm.businessLine.length > 0" class="flex gap-2 flex-wrap">
                <Button
                  v-for="b in businessLineSecond"
                  :key="b.value"
                  :variant="props.projectForm.businessLine.substring(1) === b.value ? 'default' : 'secondary'"
                  size="sm"
                  class="h-8 px-2 text-xs"
                  @click="props.projectForm.businessLine = props.projectForm.businessLine[0] + b.value"
                >
                  {{ b.label }}
                </Button>
              </div>
              <div v-if="props.projectForm.businessLine.length === 2" class="text-sm font-semibold text-primary px-2 py-1 bg-primary/10 rounded h-8 flex items-center">
                {{ props.projectForm.businessLine }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="pt-2 sm:pt-0 gap-2">
        <Button v-if="props.projectForm.id" variant="ghost" size="sm" @click="emit('reset-form')">取消</Button>
        <Button size="sm" @click="emit('submit')">{{ props.projectForm.id ? '更新' : '创建' }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
