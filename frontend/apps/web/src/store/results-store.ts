import { create } from 'zustand';
import type { CompleteResponse } from '@/types/api';

interface ResultsState {
  latestResult: CompleteResponse | null;
  setLatestResult: (result: CompleteResponse) => void;
  clearResults: () => void;
}

export const useResultsStore = create<ResultsState>((set) => ({
  latestResult: null,
  setLatestResult: (result) => set({ latestResult: result }),
  clearResults: () => set({ latestResult: null }),
}));
