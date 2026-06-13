/**
 * Binary search for a message by ID in a sorted messages array.
 * Messages are sorted by ID string (lexicographic order).
 * Returns the index if found, or -1 if not found.
 */
export function binarySearchById(messages, targetId) {
  let lo = 0;
  let hi = messages.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const midId = messages[mid].id;

    if (midId < targetId) {
      lo = mid + 1;
    } else if (midId > targetId) {
      hi = mid - 1;
    } else {
      return mid;
    }
  }

  return -1;
}

/**
 * Check if a message with the given ID exists.
 * Uses binary search if array is sorted, falls back to linear scan.
 */
export function hasMessageById(messages, id) {
  if (messages.length <= 10) {
    return messages.some(m => m.id === id);
  }
  return binarySearchById(messages, id) !== -1 || messages.some(m => m.id === id);
}

/**
 * Find index of a message by ID using binary search.
 * Falls back to linear search if array is not sorted.
 */
export function findMessageIndexById(messages, id) {
  // Check if array is sorted (first few elements)
  const checkLen = Math.min(3, messages.length);
  let isSorted = true;
  for (let i = 1; i < checkLen; i++) {
    if (messages[i - 1].id > messages[i].id) {
      isSorted = false;
      break;
    }
  }

  if (isSorted && messages.length > 10) {
    return binarySearchById(messages, id);
  }

  // Fallback to linear search for small or unsorted arrays
  return messages.findIndex(m => m.id === id);
}
