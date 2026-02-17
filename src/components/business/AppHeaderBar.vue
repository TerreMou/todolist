<script setup>
import { Plus, Settings2, Trash2 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

defineProps({
  trashCount: { type: Number, default: 0 }
});

const emit = defineEmits(['create-task', 'open-projects', 'open-trash']);
</script>

<template>
  <header class="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur shrink-0 flex-none">
    <div class="container max-w-full px-6 flex h-14 items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="font-bold text-lg tracking-tight">Jo's List</span>
      </div>

      <div class="flex items-center gap-2">
        <Button size="sm" class="gap-2 hidden sm:flex" @click="emit('create-task')">
          <Plus class="h-4 w-4" />
          新建任务
        </Button>
        <Button variant="outline" size="sm" class="h-9 gap-2 border-dashed hidden sm:flex" @click="emit('open-projects')">
          <Settings2 class="h-4 w-4" />
          项目管理
        </Button>

        <Button variant="ghost" size="icon" class="relative" @click="emit('open-trash')">
          <Trash2 class="h-5 w-5" />
          <Badge
            v-if="trashCount"
            variant="destructive"
            class="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
          >
            {{ trashCount }}
          </Badge>
        </Button>
      </div>
    </div>
  </header>
</template>
