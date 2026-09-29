-- Boondee (บุญดี) Supabase schema: profiles, cloud saves and the weekly
-- merit board. Run once in the Supabase SQL editor (safe to re-run).
-- Row level security is on everywhere: users only touch their own rows,
-- and any signed-in user can read the weekly board.

-- ---------------------------------------------------------------------------
-- Tables

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 24),
  gender text not null default 'other' check (gender in ('male', 'female', 'other')),
  created_at timestamptz not null default now()
);

-- One save per user; `data` is the serialised game state.
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- `week` is the app's week key (see src/game/time.ts weekKey()).
create table if not exists public.weekly_merit (
  user_id uuid not null references auth.users (id) on delete cascade,
  week text not null,
  merit int not null default 0 check (merit >= 0),
  name text not null default '' check (char_length(name) <= 24),
  primary key (user_id, week)
);

create index if not exists weekly_merit_board_idx on public.weekly_merit (week, merit desc);

-- ---------------------------------------------------------------------------
-- Row level security

alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.weekly_merit enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "saves_select_own" on public.saves;
drop policy if exists "saves_insert_own" on public.saves;
drop policy if exists "saves_update_own" on public.saves;
create policy "saves_select_own" on public.saves
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "saves_insert_own" on public.saves
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "saves_update_own" on public.saves
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "weekly_merit_select_all" on public.weekly_merit;
drop policy if exists "weekly_merit_insert_own" on public.weekly_merit;
drop policy if exists "weekly_merit_update_own" on public.weekly_merit;
drop policy if exists "weekly_merit_delete_own" on public.weekly_merit;
create policy "weekly_merit_select_all" on public.weekly_merit
  for select to authenticated using (true);
create policy "weekly_merit_insert_own" on public.weekly_merit
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "weekly_merit_update_own" on public.weekly_merit
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "weekly_merit_delete_own" on public.weekly_merit
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Profile sync: sign-up sends { name, gender } as user metadata; copy it into
-- profiles on signup and whenever the metadata changes (updateProfile).

create or replace function public.handle_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_name text := left(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), 24);
  meta_gender text := coalesce(new.raw_user_meta_data ->> 'gender', 'other');
begin
  if meta_gender not in ('male', 'female', 'other') then
    meta_gender := 'other';
  end if;
  insert into public.profiles (id, name, gender)
  values (new.id, meta_name, meta_gender)
  on conflict (id) do update set name = excluded.name, gender = excluded.gender;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_user_profile();

drop trigger if exists on_auth_user_meta_updated on auth.users;
create trigger on_auth_user_meta_updated
  after update of raw_user_meta_data on auth.users
  for each row
  when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute function public.handle_user_profile();

-- ---------------------------------------------------------------------------
-- Player market (ตลาดนัดสายบุญ). The client ships a simulated market; a real
-- one would list lots here and settle trades in a security-definer function
-- (move items + coins atomically, server side) instead of trusting clients.

create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('mat', 'item', 'furniture', 'outfit')),
  item_id text not null,
  qty int not null check (qty between 1 and 99),
  price int not null check (price between 1 and 100000),
  created_at timestamptz not null default now(),
  buyer uuid references auth.users (id),
  sold_at timestamptz
);

create index if not exists market_open_idx on public.market_listings (kind, created_at desc) where sold_at is null;

alter table public.market_listings enable row level security;

drop policy if exists "market readable" on public.market_listings;
create policy "market readable" on public.market_listings for select to authenticated using (true);

drop policy if exists "market list own" on public.market_listings;
create policy "market list own" on public.market_listings for insert to authenticated with check (seller = auth.uid() and buyer is null and sold_at is null);

drop policy if exists "market cancel own" on public.market_listings;
create policy "market cancel own" on public.market_listings for delete to authenticated using (seller = auth.uid() and sold_at is null);
