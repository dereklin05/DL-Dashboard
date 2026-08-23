import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { MinusBudget, MinusTransaction } from '@/lib/minus-data'

async function currentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in required.')
  return { supabase, user }
}

export async function GET() {
  try {
    const { supabase, user } = await currentUser()
    const [
      { data: transactions, error: transactionError },
      { data: settings, error: settingsError },
    ] = await Promise.all([
      supabase
        .from('minus_transactions')
        .select('id, occurred_at, amount_cents, category, is_recurrent')
        .eq('user_id', user.id)
        .order('occurred_at', { ascending: false }),
      supabase
        .from('minus_settings')
        .select('budget, last_imported_at')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
    if (transactionError || settingsError)
      throw transactionError ?? settingsError
    return NextResponse.json({
      transactions: (transactions ?? []).map((transaction) => ({
        id: transaction.id,
        date: transaction.occurred_at,
        amountCents: transaction.amount_cents,
        category: transaction.category,
        isRecurrent: transaction.is_recurrent,
      })),
      budget: (settings?.budget ?? undefined) as MinusBudget | undefined,
      lastImportedAt: settings?.last_imported_at ?? undefined,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Could not load finances.',
      },
      { status: 503 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      transactions?: MinusTransaction[]
      budget?: MinusBudget
    }
    if (!Array.isArray(body.transactions) || !body.transactions.length)
      return NextResponse.json(
        { error: 'No transactions received.' },
        { status: 400 },
      )
    if (body.transactions.length > 5000)
      return NextResponse.json(
        { error: 'Import is too large.' },
        { status: 400 },
      )
    const validTransactions = body.transactions.filter(
      (transaction) =>
        transaction.id &&
        transaction.date &&
        Number.isInteger(transaction.amountCents) &&
        transaction.category,
    )
    if (!validTransactions.length)
      return NextResponse.json(
        { error: 'No valid transactions received.' },
        { status: 400 },
      )
    const { supabase, user } = await currentUser()
    const { error: transactionError } = await supabase
      .from('minus_transactions')
      .upsert(
        validTransactions.map((transaction) => ({
          user_id: user.id,
          id: transaction.id,
          occurred_at: transaction.date,
          amount_cents: transaction.amountCents,
          category: transaction.category,
          is_recurrent: transaction.isRecurrent,
        })),
        { onConflict: 'user_id,id' },
      )
    if (transactionError) throw transactionError
    const { error: settingsError } = await supabase
      .from('minus_settings')
      .upsert({
        user_id: user.id,
        budget: body.budget ?? null,
        last_imported_at: new Date().toISOString(),
      })
    if (settingsError) throw settingsError
    return NextResponse.json({ imported: validTransactions.length })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Could not save finances.',
      },
      { status: 503 },
    )
  }
}
