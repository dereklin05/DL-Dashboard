import { NextResponse } from 'next/server'
import { getDashboardData } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await getDashboardData())
  } catch {
    return NextResponse.json(
      { error: 'Dashboard data is unavailable.' },
      { status: 502 },
    )
  }
}
