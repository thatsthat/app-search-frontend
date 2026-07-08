import { pool } from '@/lib/db'
import { NextResponse } from 'next/server'

const EMBED_URL = 'https://openrouter.ai/api/v1/embeddings'
const INSTRUCTION =
  'Instruct: Retrieve mobile health and wellness apps that match the following description\nQuery: '

let tableReady = false
async function ensureTable() {
  if (tableReady) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS embedding_results (
      id         SERIAL PRIMARY KEY,
      query      TEXT NOT NULL,
      model      TEXT NOT NULL,
      scores     JSONB NOT NULL,
      threshold  REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  tableReady = true
}

export async function GET() {
  await ensureTable()
  const [{ rows: results }, { rows: models }] = await Promise.all([
    pool.query<{ id: number; query: string; model: string; scores: Record<string, number>; threshold: number; created_at: string }>(
      `SELECT id, query, model, scores, threshold, created_at FROM embedding_results ORDER BY created_at DESC`
    ),
    pool.query<{ name: string }>(`SELECT name FROM embedding_models ORDER BY id`),
  ])
  return NextResponse.json({ results, models: models.map((m) => m.name) })
}

export async function POST(request: Request) {
  await ensureTable()
  const { query, model } = (await request.json()) as { query: string; model: string }

  if (!query?.trim() || !model?.trim()) {
    return NextResponse.json({ error: 'Missing query or model' }, { status: 400 })
  }

  // Embed the query via OpenRouter
  const embedRes = await fetch(EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({ model, input: [INSTRUCTION + query] }),
  })
  if (!embedRes.ok) {
    const err = await embedRes.text()
    return NextResponse.json({ error: err }, { status: embedRes.status })
  }
  const { data } = (await embedRes.json()) as { data: { embedding: number[]; index: number }[] }
  const queryVec = `[${data[0].embedding.join(',')}]`

  // Compute cosine similarity against all stored app embeddings for this model
  const { rows } = await pool.query<{ app_id: number; score: number }>(
    `SELECT ae.app_id, (1 - (ae.embedding <=> $1::vector))::float8 AS score
     FROM app_embeddings ae
     JOIN embedding_models em ON em.id = ae.model_id
     WHERE em.name = $2 AND ae.chunk_index = 0`,
    [queryVec, model]
  )

  const scores: Record<number, number> = {}
  for (const row of rows) scores[row.app_id] = row.score

  const { rows: [saved] } = await pool.query<{ id: number; created_at: string }>(
    `INSERT INTO embedding_results (query, model, scores, threshold)
     VALUES ($1, $2, $3, 0) RETURNING id, created_at`,
    [query, model, JSON.stringify(scores)]
  )

  return NextResponse.json({ scores, id: saved.id, threshold: 0, created_at: saved.created_at })
}
