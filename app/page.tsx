import { pool } from '@/lib/db'
import { AppsTable } from '@/components/apps-table/data-table'
import type { AppRow } from '@/components/apps-table/columns'

export default async function Page() {
  const { rows } = await pool.query<AppRow>(`
    SELECT
      a.id, a.store, a.title, a.description, a.developer, a.score, a.price, a.free,
      a.genre, a.icon_url, a.url, a.relevant,
      array_agg(DISTINCT s.search_term ORDER BY s.search_term)
        FILTER (WHERE s.search_term IS NOT NULL) AS search_terms,
      array_agg(DISTINCT s.country ORDER BY s.country)
        FILTER (WHERE s.country IS NOT NULL) AS countries
    FROM apps a
    LEFT JOIN search_results sr ON sr.app_id = a.id
    LEFT JOIN searches s ON s.id = sr.search_id
    GROUP BY a.id
    ORDER BY a.title
  `)

  const { rows: searches } = await pool.query<{ search_term: string; country: string }>(
    `SELECT DISTINCT search_term, country FROM searches ORDER BY search_term, country`
  )

  const searchTerms = Array.from(new Set(searches.map((s) => s.search_term)))
  const countries = Array.from(new Set(searches.map((s) => s.country)))

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">App Store Research</h1>
      <AppsTable data={rows} searchTerms={searchTerms} countries={countries} />
    </main>
  )
}
