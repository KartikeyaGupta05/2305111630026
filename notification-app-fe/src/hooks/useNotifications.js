import { useState, useEffect, useCallback } from "react";
import { fetchNotifications } from "../api/notifications";

// ---------------------------------------------------
// PRIORITY WEIGHTS
// Placement = 3 (highest)
// Result    = 2
// Event     = 1 (lowest)
// ---------------------------------------------------
const PRIORITY_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

// ---------------------------------------------------
// COMPARE FUNCTION
// Returns true if notification A is MORE important than B
// First compare by type weight, then by recency (timestamp)
// ---------------------------------------------------
const isMoreImportant = (a, b) => {
  const weightA = PRIORITY_WEIGHT[a.Type] || 0;
  const weightB = PRIORITY_WEIGHT[b.Type] || 0;

  if (weightA !== weightB) return weightA > weightB;

  // Same weight → newer timestamp wins
  return new Date(a.Timestamp) > new Date(b.Timestamp);
};

// ---------------------------------------------------
// MIN-HEAP IMPLEMENTATION
// The "minimum" in our heap = least important notification
// So we can quickly check if a new notification deserves a spot
// ---------------------------------------------------
class MinHeap {
  constructor() {
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap[0] || null;
  }

  // The least important item sits at index 0
  _isLessImportant(i, j) {
    return !isMoreImportant(this.heap[i], this.heap[j]) &&
      !(
        PRIORITY_WEIGHT[this.heap[i].Type] === PRIORITY_WEIGHT[this.heap[j].Type] &&
        this.heap[i].Timestamp === this.heap[j].Timestamp
      );
  }

  _swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this._isLessImportant(index, parent)) {
        this._swap(index, parent);
        index = parent;
      } else {
        break;
      }
    }
  }

  _bubbleDown(index) {
    const n = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < n && this._isLessImportant(left, smallest)) {
        smallest = left;
      }
      if (right < n && this._isLessImportant(right, smallest)) {
        smallest = right;
      }

      if (smallest !== index) {
        this._swap(index, smallest);
        index = smallest;
      } else {
        break;
      }
    }
  }

  insert(notification) {
    this.heap.push(notification);
    this._bubbleUp(this.heap.length - 1);
  }

  extractMin() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    return min;
  }

  toSortedArray() {
    // Returns a copy sorted from most important to least important
    const copy = new MinHeap();
    copy.heap = [...this.heap];
    const result = [];
    while (copy.size() > 0) {
      result.unshift(copy.extractMin());
    }
    return result;
  }
}

// ---------------------------------------------------
// BUILD TOP-N HEAP FROM A LIST OF NOTIFICATIONS
// O(n log k) where k = topN, n = total notifications
// ---------------------------------------------------
const buildTopNHeap = (notifications, topN) => {
  const heap = new MinHeap();

  for (const notification of notifications) {
    if (heap.size() < topN) {
      heap.insert(notification);
    } else {
      const min = heap.peek();
      if (isMoreImportant(notification, min)) {
        heap.extractMin();
        heap.insert(notification);
      }
    }
  }

  return heap;
};

// ---------------------------------------------------
// MAIN HOOK
// ---------------------------------------------------
const useNotifications = (topN = 10, pollingInterval = 15000) => {
  const [allNotifications, setAllNotifications] = useState([]);
  const [priorityInbox, setPriorityInbox] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---------------------------------------------------
  // RECOMPUTE PRIORITY INBOX
  // Only unread notifications are considered
  // Uses min-heap to find top-n efficiently
  // ---------------------------------------------------
  const recomputePriorityInbox = useCallback(
    (notifications, readSet, n) => {
      const unread = notifications.filter((notif) => !readSet.has(notif.ID));
      const heap = buildTopNHeap(unread, n);
      const sorted = heap.toSortedArray();
      setPriorityInbox(sorted);
    },
    []
  );

  // ---------------------------------------------------
  // LOAD / POLL NOTIFICATIONS
  // New arrivals are merged without re-sorting full list
  // Only new IDs are added — existing ones are preserved
  // ---------------------------------------------------
  const loadNotifications = useCallback(async () => {
    try {
      const fetched = await fetchNotifications();

      setAllNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.ID));
        const newOnes = fetched.filter((n) => !existingIds.has(n.ID));

        if (newOnes.length === 0) return prev;

        const merged = [...prev, ...newOnes];

        // Recompute inbox with updated list
        setReadIds((currentReadIds) => {
          recomputePriorityInbox(merged, currentReadIds, topN);
          return currentReadIds;
        });

        return merged;
      });

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [topN, recomputePriorityInbox]);

  // ---------------------------------------------------
  // MARK AS READ
  // ---------------------------------------------------
  const markAsRead = useCallback(
    (id) => {
      setReadIds((prev) => {
        const updated = new Set(prev);
        updated.add(id);
        setAllNotifications((notifications) => {
          recomputePriorityInbox(notifications, updated, topN);
          return notifications;
        });
        return updated;
      });
    },
    [topN, recomputePriorityInbox]
  );

  // ---------------------------------------------------
  // RE-RUN INBOX WHEN topN CHANGES
  // ---------------------------------------------------
  useEffect(() => {
    setAllNotifications((notifications) => {
      setReadIds((currentReadIds) => {
        recomputePriorityInbox(notifications, currentReadIds, topN);
        return currentReadIds;
      });
      return notifications;
    });
  }, [topN, recomputePriorityInbox]);

  // ---------------------------------------------------
  // INITIAL LOAD + POLLING
  // ---------------------------------------------------
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, pollingInterval);
    return () => clearInterval(interval);
  }, [loadNotifications, pollingInterval]);

  return {
    priorityInbox,
    allNotifications,
    readIds,
    loading,
    error,
    markAsRead,
  };
};

export default useNotifications;