# 순원관리 웹앱 — 이종환 순

교회 소그룹 "순"의 출석·기도제목·목양 기록을 관리하는 내부용 웹앱입니다.

---

## 빠른 시작

### 1. 설치

```bash
git clone <repo-url>
cd sunjang-app
npm install
```

### 2. Supabase 프로젝트 설정

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. **SQL Editor** 에서 마이그레이션 실행:
   ```
   supabase/migrations/001_schema.sql  ← 테이블 생성
   ```
3. **Authentication > Users** 에서 계정 3개 생성:
   - admin@church.com (관리자)
   - leader@church.com (순장)
   - pastor@church.com (교역자)
4. 생성된 UUID를 `supabase/seed/001_sample_data.sql` 의 `users` 섹션에 교체
5. SQL Editor에서 시드 데이터 실행

### 3. 환경변수 설정

```bash
cp .env.example .env.local
# .env.local 파일 열어서 Supabase URL과 anon key 입력
```

Supabase 키는 **Dashboard > Settings > API** 에서 확인

### 4. 로컬 실행

```bash
npm run dev
# http://localhost:3000 접속
```

---

## 프로젝트 구조

```
sunjang-app/
├── src/
│   ├── app/                    # Next.js App Router 페이지
│   │   ├── dashboard/          # 대시보드
│   │   ├── meetings/           # 주차 기록 작성
│   │   ├── members/            # 순원 목록
│   │   │   └── [id]/           # 순원 상세
│   │   ├── stats/              # 통계 / 보고서
│   │   └── login/              # 로그인
│   ├── lib/
│   │   ├── supabase/client.ts  # Supabase 클라이언트
│   │   ├── stats.ts            # 출석통계 계산 로직
│   │   └── excel.ts            # 엑셀 다운로드
│   └── types/index.ts          # 공통 타입 정의
│
├── supabase/
│   ├── migrations/001_schema.sql   # DB 스키마 (테이블, RLS, 뷰)
│   └── seed/001_sample_data.sql    # 샘플 데이터
│
└── .env.example                    # 환경변수 템플릿
```

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 로그인 / 권한 분리 | admin / leader / pastor 3단계 |
| 주차 기록 입력 | 표 형태 인라인 편집 (엑셀 느낌) |
| 순원별 상세 조회 | 개인정보 · 출석통계 · 타임라인 3탭 |
| 출석통계 자동 집계 | 예배/부서/순모임 출석률, 연속 결석 계산 |
| 검색 / 필터 | 이름 검색, 상태/심방 필요 필터 |
| 엑셀 다운로드 | 개인별 / 전체 그룹 보고서 |

---

## 데이터베이스 구조

```
groups          ← 순 그룹 (이종환 순 등)
  └─ members    ← 순원 개인 정보
  └─ meetings   ← 주차별 순모임 헤더
       └─ meeting_member_records  ← 순원별 출석/기도제목 기록
users           ← 로그인 사용자 (순장/관리자/교역자)
```

RLS(Row Level Security)로 순장은 자기 순 데이터만 접근 가능합니다.

---

## 출석률 계산 기준

```
예배 출석률 = 예배 출석 횟수 / 전체 기록 주차 수 × 100
부서 출석률 = 부서 출석 횟수 / 전체 기록 주차 수 × 100
순모임 출석률 = 순모임 참석 횟수 / 전체 기록 주차 수 × 100

연속 결석 = 가장 최근 주차부터 순모임 미참석이 이어진 주 수
심방 권장 = 연속 결석 3주 이상
```

Edge case: 기록이 0건인 경우 모든 수치 0 반환 (division by zero 방지)

---

## 엑셀 다운로드 파일명

```
개인별: member-{이름}-{YYYY-MM}.xlsx
전체:   group-report-{그룹명}-{YYYY-MM}.xlsx
```

---

## 배포 (Vercel 권장)

```bash
# Vercel CLI
npm i -g vercel
vercel

# 환경변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 2차 버전 예정 기능

- PDF 출력 (순원 개인 카드 형식)
- 문자 / 카카오 알림 (결석자 자동 알림)
- 다중 순 관리 (교구 전체 대시보드)
- 심방 일정 캘린더

---

## 권한 구조

| 기능 | 관리자 | 순장 | 교역자 |
|------|:---:|:---:|:---:|
| 전체 순 조회 | ✓ | - | - |
| 자기 순 조회 | ✓ | ✓ | ✓ |
| 주차 기록 작성 | ✓ | ✓ | - |
| 교역자 피드백 | ✓ | - | ✓ |
| 순원 등록/수정 | ✓ | ✓ | - |
| 통계 다운로드 | ✓ | ✓ | ✓ |
| 계정 관리 | ✓ | - | - |
