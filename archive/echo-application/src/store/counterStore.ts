import { create } from "zustand";

/**
 * CounterState defines the shape of the global counter store.
 * count: current value of the counter
 * increment: function to increment the counter
 */
interface CounterState {
  count: number;
  increment: () => void;
}

/**
 * useCounterStore is a global Zustand store for demonstration purposes.
 * Usage: const { count, increment } = useCounterStore();
 */
export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
