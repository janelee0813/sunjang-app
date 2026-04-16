// ─────────────────────────────────────────────
// 엑셀 다운로드 기능 (xlsx 라이브러리 사용)
// 설치: npm install xlsx
// ─────────────────────────────────────────────
import * as XLSX from 'xlsx';
import type { Member, MeetingMemberRecord, AttendanceStats } from '@/types';

interface RecordWithDate extends MeetingMemberRecord {
  meeting_date: string;
}

// ── 날짜 포맷 ─────────────────────────────────────────────
const fmt = (d: string) => d.slice(0, 10);
const now = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ── 순원별 개인 엑셀 다운로드 ─────────────────────────────
export function downloadMemberExcel(
  member: Member,
  stats: AttendanceStats,
  records: RecordWithDate[]
) {
  const wb = XLSX.utils.book_new();

  // 시트 1: 기본 정보 + 통계
  const info: (string | number)[][] = [
    ['이름', member.name],
    ['성별', member.gender + '성'],
    ['생년', member.birth_year ? member.birth_year + '년생' : '-'],
    ['연락처', member.phone ?? '-'],
    ['주소', member.address ?? '-'],
    ['직업', member.job ?? '-'],
    ['등록일', member.joined_at ?? '-'],
    ['상태', statusLabel(member.member_status)],
    [],
    ['── 출석 통계 ──', ''],
    ['전체 기록 주차', stats.total_meetings],
    ['예배 출석 횟수', stats.worship_count],
    ['예배 출석률(%)', stats.worship_rate],
    ['부서 출석 횟수', stats.department_count],
    ['부서 출석률(%)', stats.department_rate],
    ['순모임 출석 횟수', stats.group_count],
    ['순모임 출석률(%)', stats.group_rate],
    ['연속 순모임 결석', stats.consecutive_absence],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(info);
  ws1['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws1, '개인정보 및 통계');

  // 시트 2: 주차별 상세 기록
  const sorted = [...records].sort(
    (a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()
  );

  const header = ['날짜', '예배 출석', '부서 출석', '순모임 참석', '기도제목', '특이사항', '심방 여부', '교역자 피드백'];
  const rows = sorted.map(r => [
    fmt(r.meeting_date),
    r.worship_attended ? 'O' : 'X',
    r.department_attended ? 'O' : 'X',
    r.group_attended ? 'O' : 'X',
    r.prayer_request ?? '',
    r.special_notes ?? '',
    r.visitation_needed ? '필요' : '-',
    r.pastor_feedback ?? '',
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws2['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '주차별 기록');

  const filename = `member-${member.name}-${now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ── 전체 순원 통계 엑셀 다운로드 ──────────────────────────
export function downloadGroupExcel(
  groupName: string,
  members: Member[],
  statsMap: Record<string, AttendanceStats>
) {
  const wb = XLSX.utils.book_new();

  const header = [
    '순원명', '성별', '나이',
    '예배 출석 횟수', '예배 출석률(%)',
    '부서 출석 횟수', '부서 출석률(%)',
    '순모임 출석 횟수', '순모임 출석률(%)',
    '연속 결석(주)', '심방 필요', '상태',
  ];

  const rows = members.map(m => {
    const s = statsMap[m.id] ?? {
      total_meetings: 0, worship_count: 0, worship_rate: 0,
      department_count: 0, department_rate: 0,
      group_count: 0, group_rate: 0,
      consecutive_absence: 0,
    };
    const age = m.birth_year ? new Date().getFullYear() - m.birth_year : '-';
    return [
      m.name, m.gender + '성', age,
      s.worship_count, s.worship_rate,
      s.department_count, s.department_rate,
      s.group_count, s.group_rate,
      s.consecutive_absence,
      s.consecutive_absence >= 3 ? '필요' : '-',
      statusLabel(m.member_status),
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = Array(header.length).fill({ wch: 14 });
  ws['!cols'][0] = { wch: 12 };
  XLSX.utils.book_append_sheet(wb, ws, '순원 출석통계');

  // 요약 시트
  const activeCnt = members.filter(m => m.member_status === 'active').length;
  const avgWorship = Math.round(
    members.reduce((sum, m) => sum + (statsMap[m.id]?.worship_rate ?? 0), 0) / (members.length || 1)
  );
  const avgGroup = Math.round(
    members.reduce((sum, m) => sum + (statsMap[m.id]?.group_rate ?? 0), 0) / (members.length || 1)
  );

  const summary = [
    ['보고서 생성일', new Date().toLocaleDateString('ko-KR')],
    ['그룹명', groupName],
    ['총 순원 수', members.length],
    ['활동 중', activeCnt],
    ['평균 예배 출석률(%)', avgWorship],
    ['평균 순모임 출석률(%)', avgGroup],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summary);
  ws2['!cols'] = [{ wch: 22 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, '요약');

  const filename = `group-report-${groupName}-${now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    active: '활동중', care: '관리필요', inactive: '비활성', moved: '이동', removed: '제외',
  };
  return map[s] ?? s;
}
