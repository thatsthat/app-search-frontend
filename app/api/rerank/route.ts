import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

const RERANK_MODEL = "cohere/rerank-4-pro";

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS reranker_results (
      id         SERIAL PRIMARY KEY,
      query      TEXT NOT NULL,
      scores     JSONB NOT NULL,
      threshold  REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE reranker_results ADD COLUMN IF NOT EXISTS threshold REAL NOT NULL DEFAULT 0;`,
  );
  tableReady = true;
}

export async function GET() {
  await ensureTable();
  const { rows } = await pool.query<{
    id: number;
    query: string;
    scores: Record<string, number>;
    threshold: number;
    created_at: string;
  }>(
    `SELECT id, query, scores, threshold, created_at FROM reranker_results ORDER BY created_at DESC`,
  );
  return NextResponse.json({ rankings: rows });
}

export async function POST(request: Request) {
  await ensureTable();
  const { query, appIds } = (await request.json()) as {
    query: string;
    appIds: number[];
  };

  if (!query?.trim() || !appIds?.length) {
    return NextResponse.json(
      { error: "Missing query or appIds" },
      { status: 400 },
    );
  }

  const { rows } = await pool.query<{
    id: number;
    title: string;
    description: string | null;
    google_summary: string | null;
    apple_summary: string | null;
  }>(
    `SELECT id, title, description,
       raw_data->'google'->>'summary' AS google_summary,
       raw_data->'apple'->>'summary' AS apple_summary
     FROM apps WHERE id = ANY($1)`,
    [appIds],
  );

  const appMap = new Map(rows.map((r) => [r.id, r]));
  const orderedApps = appIds
    .map((id) => appMap.get(id))
    .filter(Boolean) as typeof rows;

  const documents = orderedApps.map((app) =>
    [app.title, app.google_summary, app.apple_summary, app.description]
      .filter(Boolean)
      .join("\n\n"),
  );

  const res = await fetch("https://openrouter.ai/api/v1/rerank", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: RERANK_MODEL,
      query,
      documents,
      top_n: documents.length,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const json = (await res.json()) as {
    results: { index: number; relevance_score: number }[];
  };
  const scores: Record<number, number> = {};
  for (const result of json.results) {
    const app = orderedApps[result.index];
    if (app) scores[app.id] = result.relevance_score;
  }

  const {
    rows: [saved],
  } = await pool.query<{ id: number; created_at: string }>(
    `INSERT INTO reranker_results (query, scores, threshold) VALUES ($1, $2, 0) RETURNING id, created_at`,
    [query, JSON.stringify(scores)],
  );

  return NextResponse.json({
    scores,
    id: saved.id,
    threshold: 0,
    created_at: saved.created_at,
  });
}
