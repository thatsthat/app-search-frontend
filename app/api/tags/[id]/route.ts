import { pool } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { threshold } = await request.json()
  const { rows } = await pool.query(
    `UPDATE tags SET threshold = $1 WHERE id = $2 RETURNING id, threshold`,
    [threshold, id]
  )
  return NextResponse.json(rows[0])
}
