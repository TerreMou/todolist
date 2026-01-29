<script setup>
import { ref, computed, watch } from 'vue';
import { Calendar as CalendarIcon, Clock, Eraser } from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { today, getLocalTimeZone, CalendarDate } from '@internationalized/date';

// 引入 Shadcn 组件
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const props = defineProps({
  modelValue: { type: [Object, String, Date, undefined], default: undefined }, // 接收外部 v-model
  placeholderText: { type: String, default: '选择日期' }
});

const emit = defineEmits(['update:modelValue']);

// 内部维护日历视图导航状态
const calendarPlaceholder = ref(today(getLocalTimeZone()));

// 年月数据
const years = computed(() => {
  const currentYear = today(getLocalTimeZone()).year;
  const range = [];
  for (let i = currentYear - 5; i <= currentYear + 10; i++) {
    range.push(i);
  }
  return range;
});

const months = [
  { value: 1, label: '一月' }, { value: 2, label: '二月' }, { value: 3, label: '三月' },
  { value: 4, label: '四月' }, { value: 5, label: '五月' }, { value: 6, label: '六月' },
  { value: 7, label: '七月' }, { value: 8, label: '八月' }, { value: 9, label: '九月' },
  { value: 10, label: '十月' }, { value: 11, label: '十一月' }, { value: 12, label: '十二月' },
];

// 更新视图（但不改变选中值）
const updateCalendarView = (type, value) => {
  const current = calendarPlaceholder.value;
  let newDate;
  if (type === 'year') {
    newDate = new CalendarDate(value, current.month, 1);
  } else {
    newDate = new CalendarDate(current.year, value, 1);
  }
  calendarPlaceholder.value = newDate;
};

// 选中今天
const selectToday = () => {
  const now = today(getLocalTimeZone());
  calendarPlaceholder.value = now;
  emit('update:modelValue', now);
};

// 清除
const clearDate = () => {
  emit('update:modelValue', undefined);
};

// 格式化显示
const displayDate = computed(() => {
  if (!props.modelValue) return null;
  // 处理 CalendarDate 对象转 JS Date
  const dateObj = new Date(props.modelValue.toString());
  return format(dateObj, "yyyy-MM-dd");
});

// 打开时重置视图
const handleOpenChange = (isOpen) => {
  if (isOpen) {
    if (props.modelValue) {
      calendarPlaceholder.value = props.modelValue;
    } else {
      calendarPlaceholder.value = today(getLocalTimeZone());
    }
  }
};
</script>

<template>
  <Popover @update:open="handleOpenChange">
    <PopoverTrigger as-child>
      <Button variant="outline" class="w-full justify-start text-left font-normal" :class="!modelValue ? 'text-muted-foreground' : ''">
        <CalendarIcon class="mr-2 h-4 w-4 shrink-0" />
        <span v-if="modelValue" class="truncate">{{ displayDate }}</span>
        <span v-else>{{ placeholderText }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-3" align="start" side="top">

      <div class="flex gap-2 mb-2 justify-between">
        <Select :model-value="calendarPlaceholder.year.toString()" @update:model-value="(v) => updateCalendarView('year', Number(v))">
          <SelectTrigger class="h-8 w-[90px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="y in years" :key="y" :value="y.toString()">{{ y }}年</SelectItem>
          </SelectContent>
        </Select>
        <Select :model-value="calendarPlaceholder.month.toString()" @update:model-value="(v) => updateCalendarView('month', Number(v))">
          <SelectTrigger class="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="m in months" :key="m.value" :value="m.value.toString()">{{ m.label }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex gap-2 mb-2">
        <Button size="sm" variant="secondary" class="h-7 text-xs flex-1" @click="selectToday">今天</Button>
        <Button size="sm" variant="ghost" class="h-7 text-xs flex-1 text-muted-foreground hover:text-destructive" @click="clearDate">
          <Eraser class="h-3 w-3 mr-1" /> 清除
        </Button>
      </div>

      <Calendar
        :model-value="modelValue"
        @update:model-value="(v) => emit('update:modelValue', v)"
        v-model:placeholder="calendarPlaceholder"
        mode="single"
        initial-focus
        class="min-h-[300px]"
      />
    </PopoverContent>
  </Popover>
</template>