-- ═══════════════════════════════════════════════════════════
-- 순관리 웹앱 - 샘플 시드 데이터
-- 주의: Supabase Auth에 먼저 사용자 계정 생성 후 UUID를 아래에 교체하세요.
-- ═══════════════════════════════════════════════════════════

-- ── 그룹 ──────────────────────────────────────────────────
insert into groups (id, name, leader_name, department_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '이종환 순', '이종환', '청년2부');

-- ── 사용자 (auth.users에 먼저 계정 생성 필요) ─────────────
-- Supabase Dashboard > Auth > Users 에서 계정 생성 후 UUID 교체
insert into users (id, name, email, role, group_id) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '관리자',     'admin@church.com',   'admin',  null),
  ('bbbbbbbb-0000-0000-0000-000000000002', '이종환',     'leader@church.com',  'leader', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '김목사',     'pastor@church.com',  'pastor', 'aaaaaaaa-0000-0000-0000-000000000001');

-- ── 순원 (8명) ─────────────────────────────────────────────
insert into members (id, group_id, name, gender, birth_year, phone, address, job, family_notes, member_status, joined_at, notes) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   '김준혁', '남', 1998, '010-1234-5678', '서울시 마포구', '대학원생',
   '부모님 모두 교인. 형제 없음.', 'care', '2023-03-05',
   '논문 스트레스로 신앙생활 침체기. 격려와 지속적인 연락 필요.'),

  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   '이서현', '여', 2000, '010-2345-6789', '서울시 서대문구', '대학생',
   '부모님 신앙 좋음. 독녀.', 'active', '2022-09-11',
   '신앙 성장 중. 순모임 개근. 은사 발굴 필요.'),

  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001',
   '최민준', '남', 1999, '010-3456-7890', '서울시 은평구', '취업준비생',
   '부모님 비신자. 본인만 교인.', 'active', '2023-06-18',
   '취업 준비 중. 가끔 지각. 기도가 필요한 시기.'),

  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001',
   '박소연', '여', 2001, '010-4567-8901', '서울시 강북구', '대학생',
   '어머니만 교인. 아버지 비신자.', 'care', '2024-01-07',
   '예배 2주 연속 결석. 연락 필요. 가정 어려움 있음.'),

  ('cccccccc-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001',
   '정다은', '여', 1997, '010-5678-9012', '경기도 고양시', '직장인',
   '부모님 모두 교인. 남동생 있음.', 'active', '2022-03-01',
   '건강 문제로 가끔 결석. 성실하고 헌신적.'),

  ('cccccccc-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001',
   '한동훈', '남', 1996, '010-6789-0123', '서울시 강서구', '직장인',
   '아내와 함께 출석. 결혼 2년차.', 'active', '2021-09-05',
   '리더십 있음. 새순원 케어에 적극적. 예비 순장 감.'),

  ('cccccccc-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001',
   '윤지수', '여', 2002, '010-7890-1234', '서울시 노원구', '대학생',
   '부모님 모두 교인.', 'active', '2024-09-01',
   '신입 순원. 잘 적응 중. 찬양 은사 있음.'),

  ('cccccccc-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001',
   '오준석', '남', 1995, '010-8901-2345', '경기도 파주시', '직장인',
   '부모님 교인. 장거리 통근.', 'inactive', '2021-03-14',
   '이사 후 연락 두절. 장거리로 참석 어려움. 재연락 시도 필요.');

-- ── 순모임 기록 (최근 4주) ────────────────────────────────
insert into meetings (id, group_id, meeting_date, place, group_notes, is_urgent, created_by) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   '2026-03-30', '교회 순모임실 B', null, false, 'bbbbbbbb-0000-0000-0000-000000000002'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   '2026-04-06', '교회 순모임실 B', '정다은 건강 기도 요청', false, 'bbbbbbbb-0000-0000-0000-000000000002'),
  ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001',
   '2026-04-13', '교회 순모임실 B', null, false, 'bbbbbbbb-0000-0000-0000-000000000002'),
  ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001',
   '2026-04-20', '교회 순모임실 B', null, false, 'bbbbbbbb-0000-0000-0000-000000000002');

-- ── 개인별 기록: 03/30 ────────────────────────────────────
insert into meeting_member_records (meeting_id, member_id, worship_attended, department_attended, group_attended, prayer_request, special_notes, visitation_needed) values
  ('dddddddd-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001', true,true,true,'지도교수와의 관계','',false),
  ('dddddddd-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002', true,true,true,'진로 방향','',false),
  ('dddddddd-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000003', true,true,true,'면접 준비','',false),
  ('dddddddd-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000004', true,true,true,'학업 스트레스','',false),
  ('dddddddd-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000005', true,true,true,'직장 관계','',false),
  ('dddddddd-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000006', false,true,true,'직장 동료 전도','출장',false),
  ('dddddddd-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000007', false,true,false,'믿음 성장','',false);

-- ── 개인별 기록: 04/06 ────────────────────────────────────
insert into meeting_member_records (meeting_id, member_id, worship_attended, department_attended, group_attended, prayer_request, special_notes, visitation_needed) values
  ('dddddddd-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000001', true,true,false,'논문 완성','',false),
  ('dddddddd-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000002', true,true,true,'대학원 입학 준비','',false),
  ('dddddddd-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000003', true,true,true,'취업 성공','',false),
  ('dddddddd-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000004', true,true,true,'학업','',false),
  ('dddddddd-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000005', false,true,false,'건강 회복','감기',false),
  ('dddddddd-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000006', true,true,true,'리더십','',false),
  ('dddddddd-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000007', true,true,true,'학과 적응','',false);

-- ── 개인별 기록: 04/13 ────────────────────────────────────
insert into meeting_member_records (meeting_id, member_id, worship_attended, department_attended, group_attended, prayer_request, special_notes, visitation_needed) values
  ('dddddddd-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000001', true,false,false,'논문 완성, 평강','',true),
  ('dddddddd-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000002', true,true,true,'대학원 입학 준비, 지혜','',false),
  ('dddddddd-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000003', true,false,false,'취업 성공, 하나님 인도','지각',false),
  ('dddddddd-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000004', false,true,true,'','',true),
  ('dddddddd-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000005', true,true,true,'건강 회복','',false),
  ('dddddddd-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000006', true,true,true,'리더십, 지혜','',false),
  ('dddddddd-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000007', true,false,true,'믿음 성장','',false);

-- ── 개인별 기록: 04/20 ────────────────────────────────────
insert into meeting_member_records (meeting_id, member_id, worship_attended, department_attended, group_attended, prayer_request, special_notes, visitation_needed) values
  ('dddddddd-0000-0000-0000-000000000004','cccccccc-0000-0000-0000-000000000001', false,false,false,'','',true),
  ('dddddddd-0000-0000-0000-000000000004','cccccccc-0000-0000-0000-000000000002', true,true,true,'대학원 입학 준비, 지혜','',false),
  ('dddddddd-0000-0000-0000-000000000004','cccccccc-0000-0000-0000-000000000003', true,true,true,'취업 성공','',false),
  ('dddddddd-0000-0000-0000-000000000004','cccccccc-0000-0000-0000-000000000004', false,false,false,'','',true),
  ('dddddddd-0000-0000-0000-000000000004','cccccccc-0000-0000-0000-000000000005', true,true,true,'','',false),
  ('dddddddd-0000-0000-0000-000000000004','cccccccc-0000-0000-0000-000000000006', true,true,true,'직장 동료 전도','',false),
  ('dddddddd-0000-0000-0000-000000000004','cccccccc-0000-0000-0000-000000000007', true,true,true,'학과 친구관계','',false);
