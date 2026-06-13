import { ref, readonly } from 'vue';

const TEXT_RENDER_PACE_MS = 24;
const TEXT_RENDER_SNAP = /[\s.,!?;:)\]]/;

/**
 * Composable for paced text streaming.
 * Buffers incoming deltas and releases them at ~24ms intervals,
 * snapping to word/sentence boundaries for natural reading rhythm.
 */
export function useStreaming() {
  const buffer = ref('');
  const displayText = ref('');
  const isPacing = ref(false);
  const isComplete = ref(false);
  let timer = null;

  /**
   * Append raw delta text to the buffer.
   * The pacing loop will release it at word boundaries.
   */
  function appendDelta(delta) {
    buffer.value += delta;
    isComplete.value = false;
    if (!isPacing.value) {
      isPacing.value = true;
      scheduleRelease();
    }
  }

  /**
   * Mark streaming as complete. Releases all remaining buffered text.
   */
  function complete() {
    isComplete.value = true;
    // Release everything remaining
    displayText.value += buffer.value;
    buffer.value = '';
    isPacing.value = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  /**
   * Reset the streaming state.
   */
  function reset() {
    buffer.value = '';
    displayText.value = '';
    isPacing.value = false;
    isComplete.value = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  /**
   * Schedule the next text release.
   * Releases text up to the next word/sentence boundary.
   */
  function scheduleRelease() {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      if (buffer.value.length === 0) {
        isPacing.value = false;
        timer = null;
        return;
      }

      // Determine how many characters to release
      const remaining = buffer.value.length;
      let chunkSize;

      // Scale chunk size based on remaining text
      if (remaining <= 2) chunkSize = 2;
      else if (remaining <= 8) chunkSize = 4;
      else if (remaining <= 20) chunkSize = 8;
      else if (remaining <= 50) chunkSize = 16;
      else chunkSize = 24;

      // Snap to word/sentence boundary
      let releaseLen = Math.min(chunkSize, remaining);
      for (let i = releaseLen; i > 0; i--) {
        if (TEXT_RENDER_SNAP.test(buffer.value[i - 1])) {
          releaseLen = i;
          break;
        }
      }

      // If no boundary found within chunk, release what we can
      if (releaseLen === 0) releaseLen = Math.min(1, remaining);

      displayText.value += buffer.value.slice(0, releaseLen);
      buffer.value = buffer.value.slice(releaseLen);

      if (buffer.value.length > 0) {
        scheduleRelease();
      } else {
        isPacing.value = false;
        timer = null;
      }
    }, TEXT_RENDER_PACE_MS);
  }

  return {
    buffer: readonly(buffer),
    displayText,
    isPacing: readonly(isPacing),
    isComplete: readonly(isComplete),
    appendDelta,
    complete,
    reset,
  };
}

/**
 * Create a streaming manager for a single message.
 * Handles both text and thinking content with independent pacing.
 */
export function createMessageStreaming() {
  const textStreaming = useStreaming();
  const thinkingStreaming = useStreaming();

  return {
    ...textStreaming,
    thinkingText: thinkingStreaming.displayText,
    thinkingBuffer: thinkingStreaming.buffer,
    thinkingIsPacing: thinkingStreaming.isPacing,
    appendThinkingDelta(delta) {
      thinkingStreaming.appendDelta(delta);
    },
    completeThinking() {
      thinkingStreaming.complete();
    },
    reset() {
      textStreaming.reset();
      thinkingStreaming.reset();
    },
  };
}
