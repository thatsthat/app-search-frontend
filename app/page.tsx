import { pool } from '@/lib/db'
import { AppsTable } from '@/components/apps-table/data-table'
import type { AppRow } from '@/components/apps-table/columns'
import { getSession } from '@/lib/auth'

export interface Tag {
  id: number
  description: string
  threshold: number
}

// Paper 2020 filter expressed as a SQL WHERE fragment (no description in SELECT needed)
const PAPER2020_WHERE = `
  AND (
    (a.title ~* 'rhinitis|hay fever|hayfever' OR a.description ~* 'rhinitis|hay fever|hayfever')
    OR ((a.genre ~* 'weather' OR a.title ~* 'pollen') AND a.description ~* 'rhinitis|hay fever|asthma|allerg')
  )
  AND a.description ~* 'symptom'
  AND NOT (a.title ~* 'home remed|natural remed|homeopath|alternative med|acupressure'
        OR a.description ~* 'home remed|natural remed|homeopath|alternative med|acupressure')
  AND NOT (
    NOT (a.title ~* 'rhinitis|hay fever|hayfever' OR a.description ~* 'rhinitis|hay fever|hayfever')
    AND (a.title ~* 'food' OR a.description ~* 'food')
  )
`

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string; paper2020?: string; keywords?: string }>
}) {
  const { tags: tagsParam, paper2020, keywords: keywordsParam } = await searchParams
  const selectedTagIds = tagsParam
    ? tagsParam.split(',').map(Number).filter((n) => !isNaN(n) && n > 0)
    : []
  const paper2020Active = paper2020 === 'true'
  const selectedKeywords = keywordsParam
    ? keywordsParam.split(',').filter(Boolean).map((w) => ({
        word: w.startsWith('-') ? w.slice(1) : w,
        negate: w.startsWith('-'),
      }))
    : []

  const { rows: tags } = await pool.query<Tag>(
    `SELECT id, description, threshold FROM tags ORDER BY id`
  )

  const paper2020Clause = paper2020Active ? PAPER2020_WHERE : ''

  const keywordClauses = selectedKeywords.map(({ word, negate }) => {
    const escaped = word.replace(/'/g, "''")
    const match = `(
      (a.title <@> '${escaped}') < 0
      OR (a.description <@> '${escaped}') < 0
      OR ((a.raw_data->'google'->>'summary') <@> '${escaped}') < 0
      OR ((a.raw_data->'apple'->>'summary') <@> '${escaped}') < 0
    )`
    return negate ? `AND NOT ${match}` : `AND ${match}`
  }).join('\n')

  let rows: AppRow[]

  if (selectedTagIds.length > 0) {
    const { rows: r } = await pool.query<AppRow>(
      `
      SELECT
        a.id, a.store, a.title, a.developer, a.score, a.price, a.free,
        a.genre, a.icon_url, a.url, a.relevant,
        MIN(sr.rank) AS rank,
        array_agg(DISTINCT s.search_term ORDER BY s.search_term)
          FILTER (WHERE s.search_term IS NOT NULL) AS search_terms,
        array_agg(DISTINCT s.country ORDER BY s.country)
          FILTER (WHERE s.country IS NOT NULL) AS countries,
        sim.similarities,
        (a.raw_data->'google'->>'maxInstalls')::float8 AS google_installs,
        (a.raw_data->'google'->>'score')::float8       AS google_score,
        (a.raw_data->'google'->>'ratings')::float8     AS google_ratings,
        (a.raw_data->'apple'->>'score')::float8        AS apple_score,
        (a.raw_data->'apple'->>'reviews')::float8      AS apple_ratings
      FROM apps a
      LEFT JOIN search_results sr ON sr.app_id = a.id
      LEFT JOIN searches s       ON s.id = sr.search_id
      LEFT JOIN (
        SELECT app_id, jsonb_object_agg(tag_id::text, max_sim) AS similarities
        FROM (
          SELECT ae.app_id, q.tag_id, MAX(1 - (ae.embedding <=> qe.embedding)) AS max_sim
          FROM app_embeddings ae
          JOIN query_embeddings qe ON qe.model_id = ae.model_id
          JOIN queries q           ON q.id = qe.query_id
          WHERE q.tag_id = ANY($1)
          GROUP BY ae.app_id, q.tag_id
        ) per_tag
        GROUP BY app_id
      ) sim ON sim.app_id = a.id
      WHERE TRUE ${paper2020Clause} ${keywordClauses}
      GROUP BY a.id, sim.similarities
      ORDER BY a.title
      `,
      [selectedTagIds]
    )
    rows = r
  } else {
    const { rows: r } = await pool.query<AppRow>(`
      SELECT
        a.id, a.store, a.title, a.developer, a.score, a.price, a.free,
        a.genre, a.icon_url, a.url, a.relevant,
        MIN(sr.rank) AS rank,
        array_agg(DISTINCT s.search_term ORDER BY s.search_term)
          FILTER (WHERE s.search_term IS NOT NULL) AS search_terms,
        array_agg(DISTINCT s.country ORDER BY s.country)
          FILTER (WHERE s.country IS NOT NULL) AS countries,
        (a.raw_data->'google'->>'maxInstalls')::float8 AS google_installs,
        (a.raw_data->'google'->>'score')::float8       AS google_score,
        (a.raw_data->'google'->>'ratings')::float8     AS google_ratings,
        (a.raw_data->'apple'->>'score')::float8        AS apple_score,
        (a.raw_data->'apple'->>'reviews')::float8      AS apple_ratings
      FROM apps a
      LEFT JOIN search_results sr ON sr.app_id = a.id
      LEFT JOIN searches s       ON s.id = sr.search_id
      WHERE TRUE ${paper2020Clause} ${keywordClauses}
      GROUP BY a.id
      ORDER BY a.title
    `)
    rows = r
  }

  const [
    { rows: searches },
    { rows: [{ total, relevant: totalRelevant }] },
  ] = await Promise.all([
    pool.query<{ search_term: string; country: string }>(
      `SELECT DISTINCT search_term, country FROM searches ORDER BY search_term, country`
    ),
    pool.query<{ total: number; relevant: number }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE relevant)::int AS relevant FROM apps`
    ),
  ])

  const searchTerms = Array.from(new Set(searches.map((s) => s.search_term)))
  const countries = Array.from(new Set(searches.map((s) => s.country)))
  const session = await getSession()

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">App Store Research</h1>
      <AppsTable
        data={rows}
        searchTerms={searchTerms}
        countries={countries}
        tags={tags}
        selectedTagIds={selectedTagIds}
        selectedKeywords={selectedKeywords}
        paper2020Active={paper2020Active}
        totalApps={total}
        totalRelevant={totalRelevant}
        isAdmin={session?.isAdmin ?? false}
      />
    </main>
  )
}
