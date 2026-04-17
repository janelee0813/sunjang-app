import * as XLSX from 'xlsx';

// ── 템플릿 다운로드 ────────────────────────────────────────

export function downloadMemberTemplate() {
  const wb = XLSX.utils.book_new();
  const header = ['이름', '성별', '역할', '생년도', '생월', '생일', '연락처', '주소', '직업', '가족사항', '등록일', '상태', '메모'];
  const example = [
    ['홍길동', '남', '순장', 1990, 4, 15, '010-1234-5678', '서울시 강남구', '회사원', '기혼, 자녀 1명', '2024-01-01', '활동중', ''],
    ['김영희', '여', '순원', 2000, 8, 22, '010-9876-5432', '', '대학생', '', '', '활동중', ''],
    ['이철수', '남', '순원', 1995, '', '', '010-1111-2222', '', '직장인', '', '', '관리필요', '연락 필요'],
  ];
  const guide = [
    [],
    ['[작성 가이드]'],
    ['성별', '남 또는 여'],
    ['역할', '순장 또는 순원 (비워두면 순원으로 등록)'],
    ['생년도', '숫자 4자리 (예: 1995)'],
    ['생월', '숫자 1~12 (예: 4)'],
    ['생일', '숫자 1~31 (예: 15)'],
    ['연락처', '010-0000-0000 형식 권장'],
    ['등록일', 'YYYY-MM-DD 형식 (예: 2024-01-15)'],
    ['상태', '활동중 / 관리필요 / 장기불참 중 하나'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([header, ...example, ...guide]);
  ws['!cols'] = [
    { wch: 10 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 6 },
    { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, '순원등록');
  XLSX.writeFile(wb, '순원등록_템플릿.xlsx');
}

export function downloadAttendanceTemplate() {
  const wb = XLSX.utils.book_new();
  const header = ['날짜', '이름', '예배출석', '부서출석', '순모임출석', '기도제목', '특이사항', '심방필요'];
  const example = [
    ['2026-04-19', '홍길동', 'O', 'O', 'O', '취업 준비', '', 'X'],
    ['2026-04-19', '김영희', 'O', 'X', 'O', '', '몸이 좀 아프다고 함', 'X'],
    ['2026-04-19', '이철수', 'X', 'X', 'X', '', '', 'O'],
  ];
  const guide = [
    [],
    ['[작성 가이드]'],
    ['날짜', 'YYYY-MM-DD 형식 (예: 2026-04-19), 일요일 날짜 입력'],
    ['이름', '등록된 순원 이름과 정확히 일치해야 함'],
    ['예배/부서/순모임출석', 'O(출석) 또는 X(불참)'],
    ['심방필요', 'O 또는 X'],
    ['날짜가 같은 행들은 같은 주차 모임으로 처리됨'],
    ['※ 교역자 피드백은 주차 기록 메뉴에서 직접 입력하세요'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([header, ...example, ...guide]);
  ws['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 28 }, { wch: 22 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, '출석기록');
  XLSX.writeFile(wb, '출석기록_템플릿.xlsx');
}

// ── 상태 변환 ──────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  '활동중': 'active', '관리필요': 'care', '장기불참': 'inactive',
  'active': 'active', 'care': 'care', 'inactive': 'inactive',
};

const toBool = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toUpperCase();
  return s === 'O' || s === 'TRUE' || s === '1' || s === '예' || s === 'Y';
};

const toStr = (v: unknown): string => String(v ?? '').trim();

const toNum = (v: unknown): number | null => {
  const n = Number(v);
  return v !== '' && !isNaN(n) ? n : null;
};

// ── 순원 파싱 ──────────────────────────────────────────────

export interface ParsedMember {
  name: string;
  gender: '남' | '여';
  is_leader: boolean;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  phone: string;
  address: string;
  job: string;
  family_notes: string;
  joined_at: string;
  member_status: string;
  notes: string;
  _row: number;
  _errors: string[];
}

export function parseMemberSheet(file: File): Promise<ParsedMember[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const headerIdx = rows.findIndex(r => r.some(c => String(c).includes('이름')));
        if (headerIdx === -1) throw new Error('헤더를 찾을 수 없습니다. 템플릿 형식을 확인해주세요.');

        const headers = rows[headerIdx].map((h: any) => String(h).trim());
        const col = (name: string) => headers.findIndex(h => h.includes(name));

        const iName    = col('이름');
        const iGender  = col('성별');
        const iRole    = col('역할');
        const iBirth   = col('생년');
        const iMonth   = col('생월');
        const iDay     = col('생일');
        const iPhone   = col('연락처');
        const iAddr    = col('주소');
        const iJob     = col('직업');
        const iFamily  = col('가족');
        const iJoined  = col('등록일');
        const iStatus  = col('상태');
        const iNotes   = col('메모');

        const results: ParsedMember[] = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          const name = toStr(r[iName]);
          if (!name || name.startsWith('[')) continue;

          const errors: string[] = [];
          const genderRaw = toStr(r[iGender]);
          const gender = genderRaw === '남' || genderRaw === '여' ? genderRaw as '남' | '여' : null;
          if (!gender) errors.push('성별은 남/여만 가능');

          const roleRaw = iRole !== -1 ? toStr(r[iRole]) : '';
          const is_leader = roleRaw === '순장';

          const statusRaw = iStatus !== -1 ? toStr(r[iStatus]) : '';
          const member_status = STATUS_MAP[statusRaw] ?? 'active';

          results.push({
            name,
            gender: gender ?? '남',
            is_leader,
            birth_year:  iBirth  !== -1 ? toNum(r[iBirth])  : null,
            birth_month: iMonth  !== -1 ? toNum(r[iMonth])  : null,
            birth_day:   iDay    !== -1 ? toNum(r[iDay])    : null,
            phone:       iPhone  !== -1 ? toStr(r[iPhone])  : '',
            address:     iAddr   !== -1 ? toStr(r[iAddr])   : '',
            job:         iJob    !== -1 ? toStr(r[iJob])    : '',
            family_notes: iFamily !== -1 ? toStr(r[iFamily]) : '',
            joined_at:   iJoined !== -1 ? toStr(r[iJoined]) : '',
            member_status,
            notes:       iNotes  !== -1 ? toStr(r[iNotes])  : '',
            _row: i + 1,
            _errors: errors,
          });
        }
        resolve(results);
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}

// ── 출석 기록 파싱 ─────────────────────────────────────────

export interface ParsedAttendanceRow {
  date: string;
  name: string;
  worship_attended: boolean;
  department_attended: boolean;
  group_attended: boolean;
  prayer_request: string;
  special_notes: string;
  visitation_needed: boolean;
  _row: number;
  _errors: string[];
}

export function parseAttendanceSheet(file: File): Promise<ParsedAttendanceRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const headerIdx = rows.findIndex(r => r.some(c => String(c).includes('날짜')));
        if (headerIdx === -1) throw new Error('헤더를 찾을 수 없습니다. 템플릿 형식을 확인해주세요.');

        const headers = rows[headerIdx].map((h: any) => String(h).trim());
        const col = (name: string) => headers.findIndex(h => h.includes(name));

        const iDate    = col('날짜');
        const iName    = col('이름');
        const iWorship = col('예배');
        const iDept    = col('부서');
        const iGroup   = col('순모임');
        const iPrayer  = col('기도');
        const iNotes   = col('특이');
        const iVisit   = col('심방');

        const results: ParsedAttendanceRow[] = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          const date = toStr(r[iDate]);
          const name = toStr(r[iName]);
          if (!date || !name || name.startsWith('[') || name.startsWith('※')) continue;

          const errors: string[] = [];
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('날짜 형식 오류 (YYYY-MM-DD 필요)');

          results.push({
            date,
            name,
            worship_attended:    iWorship !== -1 ? toBool(r[iWorship]) : false,
            department_attended: iDept    !== -1 ? toBool(r[iDept])    : false,
            group_attended:      iGroup   !== -1 ? toBool(r[iGroup])   : false,
            prayer_request:      iPrayer  !== -1 ? toStr(r[iPrayer])   : '',
            special_notes:       iNotes   !== -1 ? toStr(r[iNotes])    : '',
            visitation_needed:   iVisit   !== -1 ? toBool(r[iVisit])   : false,
            _row: i + 1,
            _errors: errors,
          });
        }
        resolve(results);
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}
