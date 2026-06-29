"use client";

import { useEffect, useState } from "react";
import { getMatches, type Match } from "@/lib/api";
import MatchCard from "@/components/MatchCard";

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-slate-800/40 border border-slate-700 p-5 space-y-4">
      <div className="h-5 w-28 rounded-full bg-slate-700" />
      <div className="flex justify-between items-center gap-3">
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-slate-700" />
          <div className="h-4 w-20 rounded bg-slate-700" />
        </div>
        <div className="h-5 w-6 rounded bg-slate-700" />
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-slate-700" />
          <div className="h-4 w-20 rounded bg-slate-700" />
        </div>
      </div>
      <div className="h-4 w-full rounded bg-slate-700" />
      <div className="h-10 w-full rounded-xl bg-slate-700" />
    </div>
  );
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMatches()
      .then(setMatches)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Error al cargar partidos")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <span className="text-2xl">⚽</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">Nexus Sport</h1>
            <p className="text-xs text-slate-400">
              Predicciones IA · Mundial 2026
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Fase Eliminatoria
          </h2>
          <p className="mt-2 text-slate-400">
            Análisis con modelos estadísticos y machine learning
          </p>
        </div>

        {/* Grid */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-900/20 border border-red-700 p-6 text-center text-red-400">
            <p className="font-semibold">No se pudo conectar con el servidor</p>
            <p className="text-sm mt-1 text-red-500">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                getMatches()
                  .then(setMatches)
                  .catch((e: unknown) =>
                    setError(
                      e instanceof Error ? e.message : "Error"
                    )
                  )
                  .finally(() => setLoading(false));
              }}
              className="mt-4 rounded-xl bg-red-700 px-5 py-2 text-sm font-semibold hover:bg-red-600"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className="rounded-2xl bg-slate-800/40 border border-slate-700 p-10 text-center text-slate-400">
            <p className="text-4xl mb-3">🏆</p>
            <p className="font-semibold text-white">
              Partidos próximamente
            </p>
            <p className="text-sm mt-1">
              Los cruces de eliminatoria se publicarán cuando finalice la fase
              de grupos.
            </p>
          </div>
        )}

        {!loading && !error && matches.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
