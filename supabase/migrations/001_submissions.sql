-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  project_description text not null,
  quotes jsonb not null default '[]'::jsonb,
  status text not null check (status in ('analysing', 'ready', 'error', 'reviewed')),
  ai_analysis jsonb,
  partner_notes text not null default '',
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);

-- Private bucket for quote PDFs (server uses service role; no public access)
insert into storage.buckets (id, name, public)
values ('quote-pdfs', 'quote-pdfs', false)
on conflict (id) do nothing;
