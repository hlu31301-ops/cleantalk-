# 01. 프로젝트 생성 및 환경 설정 지침

비전공자도 쉽게 따라 할 수 있고, AI 에이전트가 정확한 구조로 프로젝트를 생성할 수 있도록 폴더 구조와 설정 파일을 정의합니다.

---

## 1. 권장 폴더 구조
```text
clean-talk/
├── api/                    # Node.js 백엔드 (Vercel Serverless Functions)
│   ├── analyze.js          # OpenAI 악플 판별 API
│   └── feedback.js         # Supabase 피드백 조회/저장 API
├── public/                 # 프론트엔드 정적 파일 (HTML, CSS, JS)
│   ├── index.html          # 메인 페이지
│   ├── style.css           # 스타일시트
│   └── app.js              # 프론트엔드 로직
├── .env.example            # 환경변수 예시 파일
├── package.json            # 프로젝트 의존성 설정
└── vercel.json             # Vercel 배포 설정
```

---

## 2. `package.json` 설정
Node.js 백엔드에서 OpenAI와 Supabase를 사용하기 위해 아래 패키지를 설치합니다.
```json
{
  "name": "clean-talk",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vercel dev"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "openai": "^4.60.0"
  }
}
```

---

## 3. 환경변수 (`.env.example`)
Vercel 대시보드(Settings > Environment Variables) 및 로컬 `.env` 파일에 아래 값을 설정해야 합니다.
```env
OPENAI_API_KEY=your-openai-api-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
```
---

## 4. `vercel.json` 설정
정적 파일(`public/`)과 서버리스 함수(`/api/*`)가 올바르게 라우팅되도록 설정합니다.
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/public/$1" }
  ]
}
```

---

## 5. 완료 및 검증 기준
- [ ] 위 폴더 구조대로 모든 디렉토리와 파일이 생성되었는가?
- [ ] `package.json`에 `openai`, `@supabase/supabase-js`가 포함되어 있는가?
- [ ] `.env.example`에 3가지 필수 환경변수가 누락 없이 적혀 있는가?
