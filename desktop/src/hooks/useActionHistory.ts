import { useState, useCallback, useEffect } from 'react';

interface ActionEntry {
  type: string;
  workspaceId: string;
  description: string;
  undoFn: () => Promise<void>;
  redoFn: () => Promise<void>;
}

const MAX_HISTORY = 50;

export function useActionHistory() {
  const [undoStack, setUndoStack] = useState<ActionEntry[]>([]);
  const [redoStack, setRedoStack] = useState<ActionEntry[]>([]);

  const recordAction = useCallback((entry: ActionEntry) => {
    setUndoStack(prev => {
      const next = [...prev, entry];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback(async () => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      const next = prev.slice(0, -1);
      entry.undoFn().catch(console.error);
      setRedoStack(r => [...r, entry]);
      return next;
    });
  }, []);

  const redo = useCallback(async () => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      const next = prev.slice(0, -1);
      entry.redoFn().catch(console.error);
      setUndoStack(u => [...u, entry]);
      return next;
    });
  }, []);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Raccourcis clavier
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return { recordAction, undo, redo, canUndo, canRedo };
}
