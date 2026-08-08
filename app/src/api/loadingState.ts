// Standalone request-counter with pub/sub — avoids Redux circular import.
// apiService increments/decrements; React components subscribe via useIsLoading().
let count = 0;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((fn) => fn());

export const loadingState = {
  increment() { count++; notify(); },
  decrement() { count = Math.max(0, count - 1); notify(); },
  isLoading() { return count > 0; },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};
