import { pool } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await pool.query(`DELETE FROM apps WHERE id = $1`, [id])
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { relevant } = await request.json()
  const { rows } = await pool.query(
    `UPDATE apps SET relevant = $1 WHERE id = $2 RETURNING id, relevant`,
    [relevant, id]
  )
  return NextResponse.json(rows[0])
}
