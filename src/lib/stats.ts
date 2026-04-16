// ─────────────────────────────────────────────
// 출석통계 계산 유틸리티
// ─────────────────────────────────────────────
import type { AttendanceStats, MeetingMemberRecord, RecentWeekRecord } from '@/types';

interface RecordWithDate extends MeetingMemberRecord {
  meeting_date: string;
}

/**
 * 순원의 전체 기록으로부터 출석통계를 계산합니다.
 *
 * 계산 기준:
 * - 출석률 = 해당 항목 출석 횟수 / 전체 기록된 주차 수 × 100
 * - 연속 결석 = 가장 최근 주차부터 순모임 미참석이 연속된 횟수
 *
 * Edge case 처리:
 * - 기록이 0건인 경우 모든 수치 0 반환
 * - meeting_date 기준으로 최신 순 정렬하여 계산
 */
export function calcAttendanceStats(records: RecordWithDate[]): AttendanceStats {
  const total = records.length;

  if (total === 0) {
    return {
      total_meetings: 0,
      worship_count: 0,
      department_count: 0,
      group_count: 0,
      worship_rate: 0,
      department_rate: 0,
      group_rate: 0,
      consecutive_absence: 0,
      recent_4weeks: [],
    };
  }

  // 날짜 내림차순 정렬 (최신 → 오래된 순)
  const sorted = [...records].sort(
    (a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()
  );

  const worship_count    = records.filter(r => r.worship_attended).length;
  const department_count = records.filter(r => r.department_attended).length;
  const group_count      = records.filter(r => r.group_attended).length;

  const rate = (n: number) => Math.round((n / total) * 100);

  // 연속 결석: 최신 주차부터 순모임 미참석이 이어지는 횟수
  let consecutive_absence = 0;
  for (const r of sorted) {
    if (!r.group_attended) consecutive_absence++;
    else break;
  }

  // 최근 4주 기록
  const recent_4weeks: RecentWeekRecord[] = sorted.slice(0, 4).map(r => ({
    date: r.meeting_date,
    worship: r.worship_attended,
    department: r.department_attended,
    group: r.group_attended,
  }));

  return {
    total_meetings: total,
    worship_count,
    department_count,
    group_count,
    worship_rate: rate(worship_count),
    department_rate: rate(department_count),
    group_rate: rate(group_count),
    consecutive_absence,
    recent_4weeks,
  };
}

/**
 * 출석률에 따른 상태 레이블 반환
 * - 80% 이상: 양호
 * - 60% 이상: 주의
 * - 60% 미만: 위험
 */
export function getRateStatus(rate: number): 'good' | 'warning' | 'danger' {
  if (rate >= 80) return 'good';
  if (rate >= 60) return 'warning';
  return 'danger';
}

/**
 * 연속 결석 주수에 따른 심방 필요 여부 판단
 * - 3주 이상 연속 미참석 → 심방 권장
 */
export function needsVisitation(consecutiveAbsence: number): boolean {
  return consecutiveAbsence >= 3;
}

/**
 * 주차 라벨 생성 (예: 2026-04-20 → "4월 3주차")
 */
export function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const weekOfMonth = Math.ceil(d.getDate() / 7);
  return `${month}월 ${weekOfMonth}주차`;
}

/**
 * 전체 그룹 통계 집계
 * - 특정 기간 내 평균 출석률 계산
 */
export function calcGroupStats(allRecords: RecordWithDate[]) {
  const total = allRecords.length;
  if (total === 0) return { avg_worship: 0, avg_department: 0, avg_group: 0 };

  const avg = (fn: (r: RecordWithDate) => boolean) =>
    Math.round((allRecords.filter(fn).length / total) * 100);

  return {
    avg_worship:    avg(r => r.worship_attended),
    avg_department: avg(r => r.department_attended),
    avg_group:      avg(r => r.group_attended),
    visitation_needed: allRecords.filter(r => r.visitation_needed).length,
  };
}
