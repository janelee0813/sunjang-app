-- ═══════════════════════════════════════════════════════════
-- 순관리 웹앱 - Supabase 데이터베이스 스키마
-- ═══════════════════════════════════════════════════════════

-- ── 확장 활성화 ───────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 기존 테이블 초기화 (재실행 시) ───────────────────────
drop table if exists meeting_member_records cascade;
drop table if exists meetings cascade;
drop table if exists members cascade;
drop table if exists users cascade;
drop table if exists groups cascade;

-- ── groups: 순 그룹 ────────────────────────────────────────
create table groups (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,                 -- 예: "이종환 순"
  leader_name   text not null,
  department_name text not null default '청년부',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── users: 로그인 사용자 ───────────────────────────────────
-- Supabase Auth와 연동하여 auth.users.id를 FK로 사용
create table users (
  id            uuid primary key,              -- auth.users.id 와 동일
  name          text not null,
  email         text not null unique,
  role          text not null check (role in ('admin', 'leader', 'pastor')),
  group_id      uuid references groups(id) on delete set null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── members: 순원 정보 ─────────────────────────────────────
create table members (
  id             uuid primary key default uuid_generate_v4(),
  group_id       uuid not null references groups(id) on delete restrict,
  name           text not null,
  gender         text not null check (gender in ('남', '여')),
  birth_year     int,
  phone          text,
  address        text,
  job            text,
  family_notes   text,
  member_status  text not null default 'active'
                   check (member_status in ('active', 'care', 'inactive', 'moved', 'removed')),
  joined_at      date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── meetings: 주차별 순모임 헤더 ──────────────────────────
create table meetings (
  id            uuid primary key default uuid_generate_v4(),
  group_id      uuid not null references groups(id) on delete restrict,
  meeting_date  date not null,
  place         text not null default '',
  group_notes   text,
  is_urgent     boolean not null default false,
  created_by    uuid not null references users(id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (group_id, meeting_date)              -- 한 순당 날짜별 1개만
);

-- ── meeting_member_records: 주차별 순원 기록 ─────────────
create table meeting_member_records (
  id                   uuid primary key default uuid_generate_v4(),
  meeting_id           uuid not null references meetings(id) on delete cascade,
  member_id            uuid not null references members(id) on delete restrict,
  worship_attended     boolean not null default false,
  department_attended  boolean not null default false,
  group_attended       boolean not null default false,
  prayer_request       text,
  special_notes        text,
  visitation_needed    boolean not null default false,
  pastor_feedback      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (meeting_id, member_id)
);

-- ── 인덱스 ────────────────────────────────────────────────
create index idx_members_group_id on members(group_id);
create index idx_members_status   on members(member_status);
create index idx_meetings_group   on meetings(group_id, meeting_date desc);
create index idx_records_meeting  on meeting_member_records(meeting_id);
create index idx_records_member   on meeting_member_records(member_id);

-- ── updated_at 자동 갱신 함수 ─────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_groups_updated   before update on groups   for each row execute function update_updated_at();
create trigger trg_users_updated    before update on users    for each row execute function update_updated_at();
create trigger trg_members_updated  before update on members  for each row execute function update_updated_at();
create trigger trg_meetings_updated before update on meetings for each row execute function update_updated_at();
create trigger trg_records_updated  before update on meeting_member_records for each row execute function update_updated_at();

-- ── 통계 뷰: 순원별 출석 집계 ────────────────────────────
create or replace view member_attendance_stats as
select
  m.id                                                          as member_id,
  m.name                                                        as member_name,
  m.group_id,
  count(r.id)                                                   as total_meetings,
  count(r.id) filter (where r.worship_attended)                 as worship_count,
  count(r.id) filter (where r.department_attended)              as department_count,
  count(r.id) filter (where r.group_attended)                   as group_count,
  round(
    100.0 * count(r.id) filter (where r.worship_attended)
    / nullif(count(r.id), 0), 1
  )                                                             as worship_rate,
  round(
    100.0 * count(r.id) filter (where r.department_attended)
    / nullif(count(r.id), 0), 1
  )                                                             as department_rate,
  round(
    100.0 * count(r.id) filter (where r.group_attended)
    / nullif(count(r.id), 0), 1
  )                                                             as group_rate
from members m
left join meeting_member_records r on r.member_id = m.id
group by m.id, m.name, m.group_id;

-- ── RLS (Row Level Security) 정책 ─────────────────────────
alter table groups   enable row level security;
alter table users    enable row level security;
alter table members  enable row level security;
alter table meetings enable row level security;
alter table meeting_member_records enable row level security;

-- 헬퍼 함수: 현재 사용자의 role 조회
create or replace function current_user_role() returns text language sql security definer stable as $$
  select role from users where id = auth.uid();
$$;

-- 헬퍼 함수: 현재 사용자의 group_id 조회
create or replace function current_user_group() returns uuid language sql security definer stable as $$
  select group_id from users where id = auth.uid();
$$;

-- groups 정책
create policy "관리자: 전체 조회" on groups for select using (current_user_role() = 'admin');
create policy "순장/교역자: 자기 순 조회" on groups for select using (id = current_user_group());
create policy "관리자만 수정 가능" on groups for all using (current_user_role() = 'admin');

-- members 정책
create policy "관리자: 전체 조회" on members for select using (current_user_role() = 'admin');
create policy "순장/교역자: 자기 순 조회" on members for select
  using (group_id = current_user_group() or current_user_role() in ('admin', 'pastor'));
create policy "순장: 자기 순 수정" on members for all
  using (group_id = current_user_group() or current_user_role() = 'admin');

-- meetings 정책
create policy "meetings 조회" on meetings for select
  using (group_id = current_user_group() or current_user_role() = 'admin');
create policy "meetings 수정" on meetings for all
  using (group_id = current_user_group() or current_user_role() = 'admin');

-- meeting_member_records 정책
create policy "records 조회" on meeting_member_records for select
  using (exists (
    select 1 from meetings mt
    where mt.id = meeting_id
      and (mt.group_id = current_user_group() or current_user_role() = 'admin')
  ));
create policy "records 수정" on meeting_member_records for all
  using (exists (
    select 1 from meetings mt
    where mt.id = meeting_id
      and (mt.group_id = current_user_group() or current_user_role() = 'admin')
  ));
