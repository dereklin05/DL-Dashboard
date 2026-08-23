create table public.market_watchlist (
  user_id uuid not null references auth.users on delete cascade,
  symbol text not null,
  visible boolean not null default true,
  position integer not null,
  primary key (user_id, symbol)
);

alter table public.market_watchlist enable row level security;

create policy "Users manage their own market watchlist"
on public.market_watchlist
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
