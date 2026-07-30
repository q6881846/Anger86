// ============================================
// 项目状态 Store（多书架构）
// ============================================
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../idbStorage';
import type {
  ProjectState, InspirationTags, Worldview, Character, MainPlot, ChapterOutline, PlotNode,
  InspirationPlan, LogicIssue, ReviewIssue, BookEntry,
} from '../types';

interface BookManager {
  books: Record<string, BookEntry>;
  currentBookId: string;
  createBook: (title?: string, autoSwitch?: boolean) => string;
  switchBook: (bookId: string) => boolean;
  deleteBook: (bookId: string) => boolean;
  renameBook: (bookId: string, title: string) => void;
  renameCurrentBook: (title: string) => void;
  getBookList: () => BookEntry[];
}

interface ProjectStore extends ProjectState, BookManager {
  setBookTitle: (title: string) => void;
  setTargetWordCount: (n: number) => void;
  setIdea: (idea: string) => void;
  setTags: (tags: InspirationTags) => void;
  toggleEnhanceMode: () => void;
  setInspirationText: (text: string) => void;
  setInspirationPlans: (plans: InspirationPlan[]) => void;
  selectPlan: (index: number) => void;
  setHitPositioningText: (text: string) => void;
  setBookNames: (names: string[]) => void;
  setWorldview: (wv: Worldview) => void;
  setCharacters: (chars: Character[]) => void;
  addCharacter: (char: Character) => void;
  setMainPlot: (mp: MainPlot) => void;
  setCurrentVolume: (vol: number) => void;
  setVolumeNodes: (vol: number, text: string) => void;
  setVolumeSnapshot: (vol: number, text: string) => void;
  advanceVolume: () => void;
  setChapterOutlines: (chapters: ChapterOutline[] | ((prev: ChapterOutline[]) => ChapterOutline[])) => void;
  updateChapter: (n: number, patch: Partial<ChapterOutline>) => void;
  setPlotNodes: (nodes: PlotNode[]) => void;
  setCurrentChapter: (n: number) => void;
  setLogicIssues: (issues: LogicIssue[]) => void;
  setReviewIssues: (issues: ReviewIssue[]) => void;
  setContinuity: (entries: { chapter: number; summary: string }[]) => void;
  setCharacterSnapshots: (snaps: Record<string, string>) => void;
  setRuleServiceText: (text: string) => void;
  setCharacterToolText: (text: string) => void;
  setCalibrationText: (text: string) => void;
  resetProject: () => void;
}

const initialProject: ProjectState = {
  bookTitle: '',
  targetWordCount: 0,
  idea: '',
  tags: { style: [], hit: [], ban: [], open: '', entry: '', custom: [] },
  enhanceMode: true,
  inspirationText: '',
  inspirationPlans: [],
  selectedPlanIndex: -1,
  selectedPlan: '',
  hitPositioningText: '',
  bookNames: [],
  worldview: null,
  characters: [],
  currentVolume: 1,
  volumeNodes: {},
  volumeSnapshots: {},
  mainPlot: null,
  chapterOutlines: [],
  plotNodes: [],
  logicIssues: [],
  currentChapter: 1,
  reviewIssues: [],
  continuity: [],
  characterSnapshots: {},
  ruleServiceText: '',
  characterToolText: '',
  calibrationText: '',
};

function genBookId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function snapshotCurrent(s: ProjectStore): ProjectState {
  const snap: Record<string, unknown> = {};
  for (const k of Object.keys(initialProject)) {
    snap[k] = (s as unknown as Record<string, unknown>)[k];
  }
  return snap as unknown as ProjectState;
}

const initialBooks: Record<string, BookEntry> = {};
const initialCurrentBookId = '';

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      ...initialProject,
      books: initialBooks,
      currentBookId: initialCurrentBookId,

      createBook: (title, autoSwitch = true) => {
        const id = genBookId();
        const now = Date.now();
        const newBook: BookEntry = {
          id,
          title: title || '未命名',
          createdAt: now,
          updatedAt: now,
          data: { ...initialProject, bookTitle: title || '' },
        };

        if (autoSwitch) {
          set((s) => {
            const books = { ...s.books };
            if (s.currentBookId) {
              const existing = books[s.currentBookId];
              if (existing) {
                books[s.currentBookId] = { ...existing, data: snapshotCurrent(s), updatedAt: now };
              }
            }
            books[id] = newBook;
            return {
              books,
              currentBookId: id,
              ...initialProject,
              bookTitle: title || '',
            };
          });
        } else {
          set((s) => ({ books: { ...s.books, [id]: newBook } }));
        }
        return id;
      },

      switchBook: (bookId) => {
        const s = get();
        if (!s.books[bookId]) return false;
        if (bookId === s.currentBookId) return true;

        const now = Date.now();
        const books = { ...s.books };

        if (s.currentBookId && books[s.currentBookId]) {
          books[s.currentBookId] = {
            ...books[s.currentBookId],
            data: snapshotCurrent(s),
            updatedAt: now,
          };
        }

        const target = books[bookId];
        set({
          books,
          currentBookId: bookId,
          ...target.data,
        });
        return true;
      },

      deleteBook: (bookId) => {
        const s = get();
        if (!s.books[bookId]) return false;

        const books = { ...s.books };
        delete books[bookId];

        if (bookId === s.currentBookId) {
          const remaining = Object.values(books).sort((a, b) => b.updatedAt - a.updatedAt);
          if (remaining.length > 0) {
            const next = remaining[0];
            set({
              books,
              currentBookId: next.id,
              ...next.data,
            });
          } else {
            const newId = genBookId();
            const now = Date.now();
            const newBook: BookEntry = {
              id: newId,
              title: '未命名',
              createdAt: now,
              updatedAt: now,
              data: { ...initialProject },
            };
            books[newId] = newBook;
            set({
              books,
              currentBookId: newId,
              ...initialProject,
            });
          }
        } else {
          set({ books });
        }
        return true;
      },

      renameBook: (bookId, title) => {
        set((s) => {
          const entry = s.books[bookId];
          if (!entry) return s;
          return {
            books: {
              ...s.books,
              [bookId]: { ...entry, title, updatedAt: Date.now() },
            },
          };
        });
      },

      renameCurrentBook: (title) => {
        set((s) => {
          const updates: Partial<ProjectStore> = { bookTitle: title };
          if (s.currentBookId && s.books[s.currentBookId]) {
            updates.books = {
              ...s.books,
              [s.currentBookId]: {
                ...s.books[s.currentBookId],
                title,
                updatedAt: Date.now(),
              },
            };
          }
          return updates;
        });
      },

      getBookList: () => {
        const s = get();
        return Object.values(s.books).sort((a, b) => b.updatedAt - a.updatedAt);
      },

      setBookTitle: (title) => {
        set((s) => {
          const updates: Partial<ProjectStore> = { bookTitle: title };
          if (s.currentBookId && s.books[s.currentBookId]) {
            updates.books = {
              ...s.books,
              [s.currentBookId]: {
                ...s.books[s.currentBookId],
                title,
                updatedAt: Date.now(),
              },
            };
          }
          return updates;
        });
      },
      setTargetWordCount: (n) => set({ targetWordCount: Math.max(0, Math.floor(n || 0)) }),
      setIdea: (idea) => set({ idea }),
      setTags: (tags) => set({ tags }),
      toggleEnhanceMode: () => set((s) => ({ enhanceMode: !s.enhanceMode })),
      setInspirationText: (text) => set({ inspirationText: text }),
      setInspirationPlans: (plans) => set({ inspirationPlans: plans }),
      selectPlan: (index) => set((s) => ({ selectedPlanIndex: index, selectedPlan: s.inspirationPlans[index]?.title || '' })),
      setHitPositioningText: (text) => set({ hitPositioningText: text }),
      setBookNames: (names) => set({ bookNames: names }),
      setWorldview: (wv) => set({ worldview: wv }),
      setCharacters: (chars) => set({ characters: chars }),
      addCharacter: (char) => set((s) => ({ characters: [...s.characters, char] })),
      setMainPlot: (mp) => set({ mainPlot: mp }),
      setCurrentVolume: (vol) => set({ currentVolume: vol }),
      setVolumeNodes: (vol, text) => set((s) => ({ volumeNodes: { ...s.volumeNodes, [vol]: text } })),
      setVolumeSnapshot: (vol, text) => set((s) => ({ volumeSnapshots: { ...s.volumeSnapshots, [vol]: text } })),
      advanceVolume: () => set((s) => ({ currentVolume: Math.min(s.currentVolume + 1, 20) })),
      setChapterOutlines: (chapters) =>
        set((s) => ({
          chapterOutlines:
            typeof chapters === 'function'
              ? (chapters as (prev: ChapterOutline[]) => ChapterOutline[])(s.chapterOutlines)
              : chapters,
        })),
      updateChapter: (n, patch) => set((s) => ({ chapterOutlines: s.chapterOutlines.map((c) => (c.n === n ? { ...c, ...patch } : c)) })),
      setPlotNodes: (nodes) => set({ plotNodes: nodes }),
      setCurrentChapter: (n) => set({ currentChapter: n }),
      setLogicIssues: (issues) => set({ logicIssues: issues }),
      setReviewIssues: (issues) => set({ reviewIssues: issues }),
      setContinuity: (entries) => set({ continuity: entries }),
      setCharacterSnapshots: (snaps) => set({ characterSnapshots: snaps }),
      setRuleServiceText: (text) => set({ ruleServiceText: text }),
      setCharacterToolText: (text) => set({ characterToolText: text }),
      setCalibrationText: (text) => set({ calibrationText: text }),
      resetProject: () => set(initialProject),
    }),
    {
      name: 'mowen-project',
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => idbStorage),
      merge: (persisted, current) => {
        const p = (persisted as Partial<ProjectStore>) || {};
        const merged = { ...current, ...p } as Record<string, unknown>;
        for (const k of Object.keys(merged)) {
          if (!(k in current)) delete merged[k];
        }
        if (!merged.books || typeof merged.books !== 'object') merged.books = {};
        if (typeof merged.currentBookId !== 'string') merged.currentBookId = '';
        return merged as unknown as typeof current;
      },
    },
  )
);
