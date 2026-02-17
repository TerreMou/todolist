<script setup>
import { nextTick, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const props = defineProps({
  text: { type: String, default: '' },
  tag: { type: String, default: 'span' },
  className: { type: [String, Array, Object], default: '' },
  side: { type: String, default: 'top' },
});

const elRef = ref(null);
const isOverflow = ref(false);

const measureOverflow = () => {
  const el = elRef.value;
  if (!el) {
    isOverflow.value = false;
    return;
  }

  const overflowX = el.scrollWidth > el.clientWidth + 1;
  const overflowY = el.scrollHeight > el.clientHeight + 1;
  isOverflow.value = overflowX || overflowY;
};

const measureAfterLayout = async () => {
  await nextTick();
  measureOverflow();
};

onMounted(() => {
  measureAfterLayout();
  window.addEventListener('resize', measureOverflow);
});

onUpdated(() => {
  measureOverflow();
});

watch(() => props.text, () => {
  measureAfterLayout();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', measureOverflow);
});
</script>

<template>
  <Tooltip v-if="isOverflow && text">
    <TooltipTrigger as-child>
      <component :is="tag" ref="elRef" :class="className">
        {{ text }}
      </component>
    </TooltipTrigger>
    <TooltipContent :side="side">{{ text }}</TooltipContent>
  </Tooltip>
  <component v-else :is="tag" ref="elRef" :class="className">
    {{ text }}
  </component>
</template>
