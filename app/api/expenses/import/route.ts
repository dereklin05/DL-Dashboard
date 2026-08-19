import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File) || file.size > 5_000_000) return NextResponse.json({ error: 'Upload a CSV smaller than 5 MB.' }, { status: 400 })
  const text = await file.text()
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return NextResponse.json({ error: 'The CSV needs a header and at least one row.' }, { status: 400 })
  const headers = lines[0].split(',').map((value) => value.trim().toLowerCase())
  const rows = lines.slice(1).map((line) => line.split(',').map((value) => value.trim())).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
  return NextResponse.json({ imported: rows.length, rows: rows.slice(0, 100), note: 'Preview imported. Connect a database to persist expense history.' })
}
