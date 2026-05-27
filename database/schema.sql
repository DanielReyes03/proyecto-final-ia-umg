-- ═══════════════════════════════════════════════════════════════
-- Gerente IA — Supabase Schema
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Users ──────────────────────────────────────────────────────
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  role          text not null default 'user' check (role in ('admin', 'user')),
  name          text not null,
  created_at    timestamptz not null default now()
);

-- ── Connections ────────────────────────────────────────────────
create table if not exists connections (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  type             text not null check (type in ('postgresql', 'sqlserver', 'rest_api', 'knowledge_base')),
  icon_name        text not null default 'database',
  config_encrypted text not null,
  is_active        boolean not null default true,
  created_by       uuid references users(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ── Conversations ──────────────────────────────────────────────
create table if not exists conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  title      text not null default 'Nueva conversación',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx on conversations(user_id);

-- ── Messages ───────────────────────────────────────────────────
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on messages(conversation_id);

-- ── Tool Logs ──────────────────────────────────────────────────
create table if not exists tool_logs (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete set null,
  tool_name       text not null,
  input_summary   text,
  duration_ms     integer,
  success         boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists tool_logs_tool_name_idx on tool_logs(tool_name);
create index if not exists tool_logs_created_at_idx on tool_logs(created_at desc);

-- ── Row Level Security (opcional — habilitar si se usa Supabase RLS) ──────────
-- alter table users enable row level security;
-- alter table connections enable row level security;
-- alter table conversations enable row level security;
-- alter table messages enable row level security;
-- alter table tool_logs enable row level security;
