<script setup>
import { Archive, Check, Download, Filter, Grip, Kanban, LayoutList, MoreVertical, Search, Upload, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const props = defineProps({
  searchQuery: { type: String, default: '' },
  viewMode: { type: String, default: 'project' },
  isSortingMode: { type: Boolean, default: false },
  filterTypes: { type: Array, default: () => [] },
  filterStatus: { type: String, default: 'all' },
  taskTypeOptions: { type: Array, default: () => [] }
});

const emit = defineEmits([
  'update:searchQuery',
  'update:viewMode',
  'toggle-sorting',
  'toggle-filter-type',
  'clear-filter-types',
  'remove-filter-type',
  'update:filterStatus',
  'open-completed',
  'export-data',
  'import-data'
]);
</script>

<template>
  <div class="container max-w-full px-6 py-3 flex flex-col sm:flex-row gap-3 items-center border-b bg-muted/20 shrink-0 flex-none">
    <div class="relative w-full sm:w-[300px]">
      <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input :model-value="searchQuery" placeholder="搜索..." class="pl-9 bg-background" @update:model-value="(v) => emit('update:searchQuery', v)" />
    </div>

    <div class="flex bg-muted p-1 rounded-md h-9 items-center shrink-0">
      <Button
        variant="ghost"
        size="sm"
        class="h-7 px-3 text-xs"
        :class="viewMode === 'project' ? 'bg-background shadow-sm' : 'text-muted-foreground'"
        @click="emit('update:viewMode', 'project')"
      >
        <Kanban class="h-4 w-4 mr-1" />
        看板
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="h-7 px-3 text-xs"
        :class="viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'"
        @click="emit('update:viewMode', 'list')"
      >
        <LayoutList class="h-4 w-4 mr-1" />
        清单
      </Button>
    </div>

    <Button
      v-if="viewMode === 'project'"
      :variant="isSortingMode ? 'default' : 'outline'"
      size="sm"
      class="h-9 px-4 shrink-0 font-medium transition-all duration-300 relative overflow-hidden"
      :class="{
        'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg sort-btn-active': isSortingMode,
        'border-dashed border-muted-foreground/40 hover:border-primary hover:bg-primary/5': !isSortingMode
      }"
      @click="emit('toggle-sorting')"
    >
      <span class="flex items-center gap-2">
        <Grip class="h-4 w-4 transition-transform duration-300" :class="isSortingMode ? 'rotate-90 scale-110' : 'scale-100'" />
        <span class="transition-all duration-300">
          {{ isSortingMode ? '完成排序' : '排序项目' }}
        </span>
      </span>
    </Button>

    <Popover>
      <PopoverTrigger as-child>
        <Button variant="outline" size="sm" class="h-9 border-dashed px-3 shrink-0">
          <Filter class="mr-2 h-4 w-4" />
          类型
          <Badge v-if="filterTypes.length > 0" variant="secondary" class="ml-2 rounded-sm px-1 font-normal h-5">
            {{ filterTypes.length }}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[200px] p-0" align="end">
        <Command>
          <CommandInput placeholder="搜索类型..." />
          <CommandList>
            <CommandEmpty>无</CommandEmpty>
            <CommandGroup>
              <CommandItem v-for="cat in taskTypeOptions" :key="cat" :value="cat" @select="emit('toggle-filter-type', cat)">
                <div
                  class="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary"
                  :class="filterTypes.includes(cat) ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible'"
                >
                  <Check class="h-4 w-4" />
                </div>
                <span>{{ cat }}</span>
              </CommandItem>
            </CommandGroup>
            <template v-if="filterTypes.length > 0">
              <CommandSeparator />
              <CommandGroup>
                <CommandItem :value="'clear'" class="justify-center text-center" @select="emit('clear-filter-types')">
                  清除筛选
                </CommandItem>
              </CommandGroup>
            </template>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>

    <div class="flex bg-muted p-1 rounded-md h-9 items-center shrink-0">
      <Button
        v-for="s in ['all', 'active', 'completed']"
        :key="s"
        variant="ghost"
        size="sm"
        class="h-7 px-3 text-xs"
        :class="filterStatus === s ? 'bg-background shadow-sm' : 'text-muted-foreground'"
        @click="emit('update:filterStatus', s)"
      >
        {{ s === 'all' ? '全部' : (s === 'active' ? '待办' : '完成') }}
      </Button>
    </div>

    <div class="flex-1"></div>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon" class="h-9 w-9">
          <MoreVertical class="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>数据与归档</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="emit('open-completed')">
          <Archive class="mr-2 h-4 w-4" />
          已完成项目
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="emit('export-data')">
          <Download class="mr-2 h-4 w-4" />
          导出备份 (JSON)
        </DropdownMenuItem>
        <DropdownMenuItem @click="emit('import-data')">
          <Upload class="mr-2 h-4 w-4" />
          恢复数据 (Import)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>

  <div
    v-if="filterTypes.length > 0"
    class="container max-w-full px-6 py-2 flex flex-wrap gap-2 items-center bg-muted/10 shrink-0 border-b flex-none"
  >
    <span class="text-xs text-muted-foreground font-medium">筛选中:</span>
    <Badge
      v-for="cat in filterTypes"
      :key="cat"
      variant="secondary"
      class="h-6 cursor-pointer flex items-center gap-1"
      @click="emit('remove-filter-type', cat)"
    >
      {{ cat }}
      <X class="h-3 w-3 text-muted-foreground hover:text-foreground" />
    </Badge>
    <Button variant="ghost" size="sm" class="h-6 px-2 text-xs text-muted-foreground" @click="emit('clear-filter-types')">
      清除
    </Button>
  </div>
</template>
