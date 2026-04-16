// ─────────────────────────────────────────────
// 순관리 웹앱 - 공통 타입 정의
// ─────────────────────────────────────────────

export type UserRole = 'admin' | 'leader' | 'pastor';
export type MemberStatus = 'active' | 'care' | 'inactive' | 'moved' | 'removed';

// ── 사용자 (로그인 계정) ──────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  group_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── 순 그룹 ──────────────────────────────────
export interface Group {
  id: string;
  name: string;
  leader_name: string;
  department_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── 순원 ──────────────────────────────────────
export interface Member {
  id: string;
  group_id: string;
  name: string;
  gender: '남' | '여';
  birth_year: number;
  phone: string;
  address?: string;
  job?: string;
  family_notes?: string;
  member_status: MemberStatus;
  joined_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ── 주차 순모임 ───────────────────────────────
export interface Meeting {
  id: string;
  group_id: string;
  meeting_date: string;   // ISO date 'YYYY-MM-DD'
  place: string;
  group_notes?: string;
  is_urgent: boolean;
  created_by: string;     // user id
  created_at: string;
  updated_at: string;
}

// ── 주차별 순원 기록 ──────────────────────────
export interface MeetingMemberRecord {
  id: string;
  meeting_id: string;
  member_id: string;
  worship_attended: boolean;
  department_attended: boolean;
  group_attended: boolean;
  prayer_request?: string;
  special_notes?: string;
  visitation_needed: boolean;
  pastor_feedback?: string;
  created_at: string;
  updated_at: string;
}

// ── 조회용 조인 타입 ──────────────────────────
export interface MeetingWithRecords extends Meeting {
  records: (MeetingMemberRecord & { member: Member })[];
}

export interface MemberWithStats extends Member {
  stats: AttendanceStats;
  recent_records: MeetingMemberRecord[];
}

// ── 출석 통계 ─────────────────────────────────
export interface AttendanceStats {
  total_meetings: number;
  worship_count: number;
  department_count: number;
  group_count: number;
  worship_rate: number;     // 0-100
  department_rate: number;
  group_rate: number;
  consecutive_absence: number;  // 순모임 기준 연속 결석 주수
  recent_4weeks: RecentWeekRecord[];
}

export interface RecentWeekRecord {
  date: string;
  worship: boolean;
  department: boolean;
  group: boolean;
}

// ── 폼 타입 ───────────────────────────────────
export type MeetingFormData = Pick<Meeting, 'meeting_date' | 'place' | 'group_notes' | 'is_urgent'>;

export type MemberFormData = Pick<
  Member,
  'name' | 'gender' | 'birth_year' | 'phone' | 'address' | 'job' | 'family_notes' | 'member_status' | 'joined_at' | 'notes'
>;

export interface MeetingRecordFormRow {
  member_id: string;
  member_name: string;
  worship_attended: boolean;
  department_attended: boolean;
  group_attended: boolean;
  prayer_request: string;
  special_notes: string;
  visitation_needed: boolean;
  pastor_feedback: string;
}

// ── 다운로드 옵션 ─────────────────────────────
export interface DownloadOptions {
  type: 'member' | 'group';
  member_id?: string;
  group_id?: string;
  date_from?: string;
  date_to?: string;
}
