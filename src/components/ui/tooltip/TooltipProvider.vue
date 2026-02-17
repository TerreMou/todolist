<script setup>
import { TooltipProvider, useForwardProps } from "reka-ui";

const props = defineProps({
  delayDuration: { type: Number, required: false, default: 200 },
  disableHoverableContent: { type: Boolean, required: false },
  disableClosingTrigger: { type: Boolean, required: false },
  ignoreNonKeyboardFocus: { type: Boolean, required: false },
});

const forwarded = useForwardProps(props);
</script>

<template>
  <TooltipProvider v-bind="forwarded">
    <slot />
  </TooltipProvider>
</template>
