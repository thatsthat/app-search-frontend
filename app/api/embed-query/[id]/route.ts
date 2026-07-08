import { pool } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { threshold } = (await request.json()) as { threshold: number }
  const { rows } = await pool.query(
    `UPDATE embedding_results SET threshold = $1 WHERE id = $2 RETURNING id, threshold`,
    [threshold, id],
  )
  if (!rows.length) return new NextResponse(null, { status: 404 })
  return NextResponse.json(rows[0])
}
