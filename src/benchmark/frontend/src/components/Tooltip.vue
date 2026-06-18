<script setup>
import { ref, onBeforeUnmount } from 'vue'

const props = defineProps({
  text: {
    type: String,
    default: '',
  },
})

const show = ref(false)
const triggerRef = ref(null)
const tooltipRef = ref(null)
let removeFn = null

function positionTooltip() {
  if (!triggerRef.value || !tooltipRef.value) return
  const triggerRect = triggerRef.value.getBoundingClientRect()
  const tooltipEl = tooltipRef.value
  const tooltipRect = tooltipEl.getBoundingClientRect()

  const top = triggerRect.bottom + 8
  const left = triggerRect.left + triggerRect.width / 2

  tooltipEl.style.top = `${top}px`
  tooltipEl.style.left = `${left}px`
  tooltipEl.style.transform = 'translate(-50%, 0)'
}

function showTooltip() {
  if (!props.text) return
  show.value = true
  requestAnimationFrame(() => {
    positionTooltip()
  })
}

function hideTooltip() {
  show.value = false
}

function mountTooltip() {
  if (removeFn) return

  const container = document.getElementById('tooltip-root') || (() => {
    const el = document.createElement('div')
    el.id = 'tooltip-root'
    el.style.position = 'fixed'
    el.style.pointerEvents = 'none'
    el.style.zIndex = '100'
    document.body.appendChild(el)
    return el
  })()

  const el = document.createElement('div')
  el.style.position = 'fixed'
  el.style.pointerEvents = 'none'
  el.style.zIndex = '100'
  el.innerHTML = `
    <div class="relative fixed left-1/2 -translate-x-1/2 whitespace-nowrap">
      <div class="bg-text-primary text-bg-primary text-xs px-2.5 py-1.5 rounded-md shadow-lg font-medium">
        ${props.text}
        <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-text-primary rotate-45" />
      </div>
    </div>
  `
  tooltipRef.value = el
  container.appendChild(el)

  removeFn = () => {
    if (el.parentNode) {
      el.parentNode.removeChild(el)
    }
    removeFn = null
    tooltipRef.value = null
  }
}

function handleEnter() {
  if (!props.text) return
  mountTooltip()
  showTooltip()
}

function handleLeave() {
  hideTooltip()
  if (removeFn) {
    removeFn()
  }
}

onBeforeUnmount(() => {
  if (removeFn) removeFn()
})
</script>

<template>
  <div
    ref="triggerRef"
    class="inline-flex items-center"
    @mouseenter="handleEnter"
    @mouseleave="handleLeave"
    @focus="handleEnter"
    @blur="handleLeave"
  >
    <slot />
  </div>
</template>
