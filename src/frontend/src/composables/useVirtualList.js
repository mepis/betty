import { ref, computed } from 'vue';

const BUFFER_COUNT = 5; // Messages to render above/below viewport

/**
 * Lightweight virtualization composable for variable-height message lists.
 * Uses estimated heights for positioning, with real measurement on demand.
 */
export function useVirtualList(items, containerRef) {
  const scrollOffset = ref(0);
  const containerHeight = ref(600);
  const measuredHeights = new Map(); // itemIndex -> actual height
  const estimatedHeight = 120; // Average message height in px

  function getHeight(index) {
    return measuredHeights.get(index) ?? estimatedHeight;
  }

  function getTotalHeight() {
    let total = 0;
    for (let i = 0; i < items.value.length; i++) {
      total += getHeight(i);
    }
    return total;
  }

  function getOffsetTop(index) {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getHeight(i);
    }
    return offset;
  }

  // Calculate visible range
  const visibleRange = computed(() => {
    const total = items.value.length;
    if (total === 0) return { start: 0, end: 0, offsetTop: 0, offsetBottom: 0 };

    // Find first visible item
    let start = 0;
    let accumulated = 0;
    for (let i = 0; i < total; i++) {
      if (accumulated + getHeight(i) > scrollOffset.value - BUFFER_COUNT * estimatedHeight) {
        start = Math.max(0, i - BUFFER_COUNT);
        break;
      }
      accumulated += getHeight(i);
      start = i + 1;
    }
    start = Math.max(0, start);

    // Find last visible item
    let end = total - 1;
    accumulated = 0;
    for (let i = 0; i < total; i++) {
      accumulated += getHeight(i);
      if (accumulated > scrollOffset.value + containerHeight.value + BUFFER_COUNT * estimatedHeight) {
        end = Math.min(total - 1, i + BUFFER_COUNT);
        break;
      }
    }

    return {
      start,
      end,
      offsetTop: getOffsetTop(start),
      offsetBottom: getTotalHeight() - getOffsetTop(end + 1),
    };
  });

  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value;
    const result = [];
    for (let i = start; i <= end && i < items.value.length; i++) {
      result.push({ index: i, item: items.value[i] });
    }
    return result;
  });

  function onScroll() {
    if (containerRef.value) {
      scrollOffset.value = containerRef.value.scrollTop;
      containerHeight.value = containerRef.value.clientHeight;
    }
  }

  /**
   * Measure the actual height of a rendered message and update cached heights.
   */
  function measureItem(index, element) {
    if (element) {
      const height = element.offsetHeight;
      if (height > 0) {
        measuredHeights.set(index, height);
      }
    }
  }

  return {
    scrollOffset,
    containerHeight,
    visibleRange,
    visibleItems,
    totalHeight: computed(() => getTotalHeight()),
    getOffsetTop,
    getHeight,
    onScroll,
    measureItem,
  };
}
