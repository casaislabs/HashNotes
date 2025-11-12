"use client";

import { useEffect, useState } from "react";
import type { Note } from "@/types/note";
import NoteForm from "./NoteForm";
import NotesList from "./NotesList";

type ApiNoteItem = { cid: string; url: string; createdAt: string; text?: string };
const isApiNoteItem = (r: unknown): r is ApiNoteItem => {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  return typeof o.cid === "string" && typeof o.url === "string" && typeof o.createdAt === "string";
};

export default function NotePanel() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("hashnotes.notes") : null;
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [hydrated, setHydrated] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  useEffect(() => {
    const id = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/notes?limit=20&includeText=false&appOnly=false`, { signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        const remote = Array.isArray(json.items) ? (json.items as unknown[]) : [];
        setNotes((prev) => {
          const seen = new Set(prev.map((p) => p.cid));
          const merged = [
            ...prev,
            ...remote
              .filter((r) => isApiNoteItem(r) && !seen.has((r as ApiNoteItem).cid))
              .map((r) => {
                const item = r as ApiNoteItem;
                return {
                  cid: item.cid,
                  text: typeof item.text === "string" ? item.text : "",
                  url: item.url,
                  createdAt: item.createdAt,
                };
              }),
          ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          localStorage.setItem("hashnotes.notes", JSON.stringify(merged));
          return merged;
        });
      } catch {}
    })();
    return () => controller.abort();
  }, [hydrated]);

  const onCreated = (note: Note) => {
    setNotes((prev) => {
      const next = [note, ...prev];
      localStorage.setItem("hashnotes.notes", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-6">
      <NoteForm onCreated={onCreated} />
      <NotesList notes={hydrated ? notes.slice(0, visibleCount) : []} />
      {hydrated && visibleCount < notes.length && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisibleCount((c) => Math.min(c + 3, notes.length))}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-black/5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Show more
          </button>
        </div>
      )}
    </div>
  );
}