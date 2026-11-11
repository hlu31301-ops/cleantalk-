# AGENTS.md - Antigravity AI 코딩 에이전트 작업 규칙

이 문서는 Antigravity AI 코딩 에이전트가 **악플 판별 웹 서비스**를 개발할 때 반드시 지켜야 하는 작업 규칙과 원칙을 정의합니다.

---

## 1. 프로젝트 개요
- **서비스명**: 클린톡(CleanTalk) - AI 악플 판별기
- **목적**: 사용자가 입력한 댓글이 악성 댓글(악플)인지 아닌지를 AI로 판별하여 직관적인 신호등(경고등/초록불)과 귀여운 강아지 캐릭터 표정으로 알려주고, 로그인 없이 서비스 피드백을 남길 수 있는 웹 서비스 구축
- **대상 사용자**: 비전공자 포함 일반 웹 사용자

---

## 2. 기술 스택 (변경 금지)
| 영역 | 기술 | 비고 |
| :--- | :--- | :--- |
| **Front End** | HTML5, CSS3, Vanilla JavaScript | React/Vue 등 프레임워크 사용 금지 |
| **Back End** | Node.js (Vercel Serverless Functions) | Express 별도 서버 대신 `/api/*.js` 권장 |
| **AI** | OpenAI API (`gpt-4o-mini` 권장) | 서버 사이드(`/api/analyze`)에서만 호출 |
| **DB** | Supabase (PostgreSQL) | 피드백 저장 및 최신순 조회 |
| **배포** | Vercel | GitHub 연동 또는 Vercel CLI 배포 |

---

## 3. 절대 제약 조건 (Constraints)
1. **API 키 보안**: `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 등 민감한 키는 절대 프론트엔드(`index.html`, `app.js` 등)에 노출하지 않는다. 반드시 Vercel 환경변수 및 `/api/*` 서버리스 함수에서만 사용한다.
2. **프레임워크 금지**: 프론트엔드는 순수 HTML, CSS, JavaScript만 사용한다. 빌드 도구나 번들러(Webpack, Vite 등) 없이 정적 파일로 바로 동작해야 한다.
3. **로그인 기능 제외**: 피드백 작성 및 댓글 판별은 로그인/회원가입 없이 누구나 즉시 사용할 수 있어야 한다.
4. **추측 금지**: UI 컬러, 레이아웃, API 응답 형식, DB 컬럼명은 `PRD.md` 및 `docs/` 문서에 명시된 스펙을 그대로 따른다.

---

## 4. 작업 순서 (Workflow)
에이전트는 아래 순서대로 작업을 진행한다.
1. `docs/01-project-setup.md`를 참고하여 폴더 구조 및 `package.json`, `.env.example`, `vercel.json` 생성
2. `docs/02-ui-design-guide.md`를 참고하여 `public/index.html`, `public/style.css` 구현 (첨부 이미지 기반 딥 그린 & 옐로우 테마 + 강아지 캐릭터 UI)
3. `docs/05-backend-api-spec.md`를 참고하여 `/api/analyze.js` 및 `/api/feedback.js` 구현
4. `docs/03-feature-ai-moderation.md` 및 `docs/04-feature-feedback-supabase.md`를 참고하여 `public/app.js` 기능 연동
5. `docs/06-qa-verification.md`의 체크리스트를 기준으로 자체 검증 후 완료 보고

---

## 5. 완료 기준 (Definition of Done)
- 모든 파일이 에러 없이 생성되고, 로컬(`vercel dev`) 또는 Vercel 배포 환경에서 정상 동작한다.
- 댓글 입력 후 판별 시 **악플이면 빨간 경고등 + 화난 강아지**, **악플이 아니면 초록불 + 웃는 강아지 + "다시 입력해주세요" 안내**가 표시된다.
- 피드백 작성 시 로그인 없이 Supabase에 저장되고, 화면 하단 목록에 **최신순**으로 즉시 반영된다.
