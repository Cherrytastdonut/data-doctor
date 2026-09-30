# Data Doctor AI

CSV 데이터를 검사하고 사용자가 선택한 규칙으로 정리한 뒤 수정된 CSV를 내려받는 웹서비스입니다.

## 주요 기능
- CSV 업로드 및 표 미리보기
- 결측값, 완전 중복 행, 앞뒤 공백 자동 탐지
- 결측값 처리: 유지 / 행 삭제 / 최빈값 / 평균값 / 중앙값 / 직접 입력
- 중복 삭제 및 공백 제거
- 수정 전후 데이터 확인 및 Clean CSV 다운로드
- OpenAI API를 이용한 의미상 형식 불일치 분석
- Supabase PostgreSQL에 작업 기록 저장 및 조회

## 사용 기술
- GitHub: 소스 관리
- Vercel: 웹사이트 및 /api 서버 함수 배포
- Supabase: PostgreSQL 데이터베이스
- OpenAI API: AI 데이터 형식 분석
- Google Sheets API: 과제 필수 Google API 기능으로 다음 단계에서 추가

## Supabase
Supabase SQL Editor에서 `supabase.sql`을 실행합니다.

## Vercel 환경변수
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (선택)
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

민감한 키는 GitHub 코드에 직접 넣지 않습니다.
