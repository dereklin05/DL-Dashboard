create table public.minus_transactions (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  occurred_at timestamptz not null,
  amount_cents integer not null,
  category text not null,
  is_recurrent boolean not null default false,
  primary key (user_id, id)
);

create table public.minus_settings (
  user_id uuid primary key references auth.users on delete cascade,
  budget jsonb,
  last_imported_at timestamptz not null default now()
);

alter table public.minus_transactions enable row level security;
alter table public.minus_settings enable row level security;

create policy "Users manage their own Minus transactions"
on public.minus_transactions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own Minus settings"
on public.minus_settings
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
