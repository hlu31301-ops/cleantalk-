// =====================================================
// server.js - 로컬 개발용 서버 (Vercel 로그인 불필요)
// 역할: public/ 폴더의 정적 파일 서빙 + /api/* 라우팅을
//       한 파일에서 처리합니다.
// 실행: node server.js
// 접속: http://localhost:3000
// =====================================================

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// __dirname을 ES Module 환경에서 사용하기 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일을 직접 읽어서 환경변수를 로드하는 함수
// (dotenv 패키지 없이 동작합니다)
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env 파일이 없습니다! .env 파일을 먼저 만들어주세요.");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // 주석(#)이나 빈 줄은 건너뜁니다
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    // 아직 설정되지 않은 환경변수만 적용합니다
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// 환경변수 로드
loadEnv();

// 플레이스홀더가 그대로 남아있는지 확인
function checkEnvPlaceholders() {
  const required = ["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
  for (const key of required) {
    if (!process.env[key] || process.env[key].includes("YOUR_")) {
      console.error(`❌ .env 파일에서 ${key} 값을 실제 값으로 바꿔주세요!`);
      process.exit(1);
    }
  }
}
checkEnvPlaceholders();

// 파일 확장자별 Content-Type 매핑
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};

// 요청 body(본문)를 JSON으로 파싱하는 헬퍼 함수
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

// JSON 응답을 보내는 헬퍼 함수
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

// ── API 핸들러들을 동적으로 불러오기 ──────────────────
// Vercel 서버리스 함수와 동일한 형식의 req/res 객체를 만들어 줍니다.
async function handleAPI(req, res, url) {
  const body = await parseBody(req);

  // Vercel 스타일의 req 객체 모방
  req.body = body;
  req.query = Object.fromEntries(url.searchParams);
  req.method = req.method;

  // JSON 응답 헬퍼를 res에 추가 (Vercel API와 동일한 인터페이스)
  res.status = (code) => {
    res._statusCode = code;
    return res;
  };
  res.json = (data) => {
    sendJSON(res, res._statusCode || 200, data);
  };
  res._statusCode = 200;

  const pathname = url.pathname;

  try {
    if (pathname === "/api/analyze") {
      // /api/analyze.js 모듈을 동적으로 불러와 실행합니다
      const { default: handler } = await import(`./api/analyze.js?t=${Date.now()}`);
      await handler(req, res);

    } else if (pathname === "/api/feedback") {
      // /api/feedback.js 모듈을 동적으로 불러와 실행합니다
      const { default: handler } = await import(`./api/feedback.js?t=${Date.now()}`);
      await handler(req, res);

    } else {
      sendJSON(res, 404, { error: "API 경로를 찾을 수 없습니다." });
    }
  } catch (err) {
    console.error("API 처리 오류:", err);
    sendJSON(res, 500, { error: "서버 내부 오류가 발생했습니다." });
  }
}

// ── 정적 파일 서버 ────────────────────────────────────
function handleStatic(req, res, url) {
  let filePath = path.join(__dirname, "public", url.pathname);

  // 경로가 '/'이면 index.html을 서빙합니다
  if (url.pathname === "/" || url.pathname === "") {
    filePath = path.join(__dirname, "public", "index.html");
  }

  // 파일이 없으면 index.html로 fallback (SPA 방식)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, "public", "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "text/plain";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

// ── 메인 HTTP 서버 생성 ───────────────────────────────
const PORT = 3000;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // /api/로 시작하는 요청은 API 핸들러로 보냅니다
  if (url.pathname.startsWith("/api/")) {
    await handleAPI(req, res, url);
  } else {
    // 그 외는 public/ 폴더에서 파일을 찾아 서빙합니다
    handleStatic(req, res, url);
  }
});

server.listen(PORT, () => {
  console.log("====================================");
  console.log("🐾 CleanTalk 로컬 서버 실행 중!");
  console.log(`👉 브라우저에서 열기: http://localhost:${PORT}`);
  console.log("====================================");
  console.log("서버를 종료하려면 Ctrl + C 를 누르세요.");
});

