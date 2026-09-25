import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  emptyBoard,
  parseBoard,
  roomKeys,
  type Board,
  type RoomKey,
  type Goal,
  goals,
} from "../engine/temple";
type Frame = {
  board: Board;
  hand: (RoomKey | null)[];
  architectDefeated: boolean;
};
type State = Frame & {
  goal: Goal;
  preventLoops: boolean;
  past: Frame[];
  future: Frame[];
  commit: (frame: Partial<Frame>) => void;
  undo: () => void;
  redo: () => void;
  setGoal: (goal: Goal) => void;
  setLoops: (value: boolean) => void;
  load: (board: Board) => void;
};
const frame = (s: Frame): Frame => ({
  board: s.board,
  hand: s.hand,
  architectDefeated: s.architectDefeated,
});
export const useTemple = create<State>()(
  persist(
    (set) => ({
      board: emptyBoard(),
      hand: ["path", "gen", "smithy", "garrison", "thaum", "sac"],
      architectDefeated: false,
      goal: "balanced",
      preventLoops: true,
      past: [],
      future: [],
      commit: (change) =>
        set((s) => ({
          ...change,
          past: [...s.past, frame(s)].slice(-100),
          future: [],
        })),
      undo: () =>
        set((s) =>
          s.past.length
            ? {
                ...s.past.at(-1)!,
                past: s.past.slice(0, -1),
                future: [frame(s), ...s.future],
              }
            : {},
        ),
      redo: () =>
        set((s) =>
          s.future.length
            ? {
                ...s.future[0],
                past: [...s.past, frame(s)],
                future: s.future.slice(1),
              }
            : {},
        ),
      setGoal: (goal) => set({ goal }),
      setLoops: (preventLoops) => set({ preventLoops }),
      load: (board) =>
        set((s) => ({
          board: parseBoard(board),
          past: [...s.past, frame(s)].slice(-100),
          future: [],
        })),
    }),
    {
      name: "atlas-temple-v2",
      partialize: (s) => ({
        board: s.board,
        hand: s.hand,
        architectDefeated: s.architectDefeated,
        goal: s.goal,
        preventLoops: s.preventLoops,
      }),
      merge: (raw, current) => {
        try {
          const v = raw as Partial<State>;
          return {
            ...current,
            board: parseBoard(v.board),
            hand:
              Array.isArray(v.hand) && v.hand.length === 6
                ? v.hand.map((k) => (k && roomKeys.includes(k) ? k : null))
                : current.hand,
            architectDefeated: v.architectDefeated === true,
            goal: v.goal && goals.includes(v.goal) ? v.goal : "balanced",
            preventLoops: v.preventLoops !== false,
          };
        } catch {
          return current;
        }
      },
    },
  ),
);
