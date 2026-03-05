"use client";

import { useState } from "react";
import type { Note } from "@/types/note";

type Props = {
  notes: Note[];
};

export default function NotesList({ notes }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const previewLimit = 320;
  return (
    <ul className="mt-8 space-y-4">
      {notes.length === 0 ? (
        <li className="text-sm text-slate-500 dark:text-slate-400">No notes yet.</li>
      ) : (
        notes.map((n) => (
          <li key={n.cid} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500 dark:text-slate-400">{new Date(n.createdAt).toLocaleString()}</div>
              <div className="flex items-center gap-2">
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-slate-300 px-3 py-1 text-sm text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-violet-600 hover:bg-black/5 dark:border-slate-700 dark:hover:bg-white/10"
                >
                  Open on IPFS
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(n.cid)}
                  className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-black dark:hover:bg-slate-200"
                >
                  Copy CID
                </button>
              </div>
            </div>
            {n.text ? (
              <>
                <p className="mt-3 whitespace-pre-wrap break-words text-slate-900 dark:text-slate-100">
                  {expanded[n.cid] || n.text.length <= previewLimit ? n.text : `${n.text.slice(0, previewLimit)}…`}
                </p>
                {n.text.length > previewLimit && (
                  <button
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [n.cid]: !prev[n.cid],
                      }))
                    }
                    className="mt-2 text-sm font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                  >
                    {expanded[n.cid] ? "See less" : "See more"}
                  </button>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No preview</p>
            )}
            <div className="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">CID: {n.cid}</div>
          </li>
        ))
      )}
    </ul>
  );
}
