import { ref, readonly, onUnmounted } from 'vue';

/**
 * Composable for gesture-aware auto-scroll.
 * - Detects user scroll intent (wheel/touch/pointer events)
 * - 90-frame grace period after content changes
 * - Floating "jump to bottom" button when scrolled away during streaming
 */
export function useAutoScroll(containerRef, isStreamingGetter) {
  const shouldAutoScroll = ref(true);
  const showResumeButton = ref(false);
  let graceFrames = 0;
  const GRACE_PERIOD = 90;
  const ACTIVE_TURN_HOLD = 12;
  let rafId = null;
  let scrollCheckRaf = null;

  /**
   * Get current streaming state (supports ref or getter function).
   */
  function getStreaming() {
    if (typeof isStreamingGetter === 'function') return isStreamingGetter();
    return isStreamingGetter.value ?? false;
  }

  /**
   * Detect if the user is at the bottom of the scroll container.
   */
  function isAtBottom(el) {
    if (!el) return true;
    return el.scrollHeight - el.clientHeight - el.scrollTop <= 4;
  }

  /**
   * Scroll to the bottom smoothly.
   */
  function scrollToBottom(el) {
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth',
    });
  }

  /**
   * Called when content changes. Starts the grace period.
   */
  function onContentChange() {
    graceFrames = getStreaming() ? GRACE_PERIOD + ACTIVE_TURN_HOLD : GRACE_PERIOD;
    if (!rafId) {
      rafId = requestAnimationFrame(graceLoop);
    }
  }

  /**
   * Grace period loop — keeps auto-scroll enabled for N frames after content change.
   */
  function graceLoop() {
    graceFrames--;
    if (graceFrames > 0) {
      shouldAutoScroll.value = true;
      rafId = requestAnimationFrame(graceLoop);
    } else {
      rafId = null;
      // After grace period, check if we should auto-scroll
      const el = containerRef.value;
      if (el && getStreaming() && isAtBottom(el)) {
        scrollToBottom(el);
      }
    }
  }

  /**
   * Handle user scroll events to detect intent.
   */
  function onUserScroll(e) {
    const el = containerRef.value;
    if (!el) return;

    // User scrolled — disable auto-scroll
    shouldAutoScroll.value = false;
    graceFrames = 0;

    // Check if user scrolled to bottom (re-enable auto-scroll)
    if (isAtBottom(el)) {
      shouldAutoScroll.value = true;
    }
  }

  /**
   * Continuous scroll position check — shows/hides resume button.
   */
  function checkScrollPosition() {
    const el = containerRef.value;
    if (!el) {
      scrollCheckRaf = requestAnimationFrame(checkScrollPosition);
      return;
    }

    const streaming = getStreaming();
    if (streaming) {
      const atBottom = isAtBottom(el);
      showResumeButton.value = !atBottom;

      if (shouldAutoScroll.value && !atBottom) {
        scrollToBottom(el);
      }
    } else {
      showResumeButton.value = false;
    }

    scrollCheckRaf = requestAnimationFrame(checkScrollPosition);
  }

  // Start the scroll position checker
  scrollCheckRaf = requestAnimationFrame(checkScrollPosition);

  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId);
    if (scrollCheckRaf) cancelAnimationFrame(scrollCheckRaf);
  });

  return {
    shouldAutoScroll: readonly(shouldAutoScroll),
    showResumeButton: readonly(showResumeButton),
    onContentChange,
    onUserScroll,
    scrollToBottom: (el) => scrollToBottom(containerRef.value || el),
  };
}
