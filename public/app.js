// =====================================================
// public/app.js - CleanTalk 프론트엔드 로직
// 역할: 악플 판별 버튼 클릭 처리 + 피드백 조회/저장 기능
// 모든 API 호출은 /api/* 서버리스 함수를 통해 이루어지며,
// API 키는 절대 이 파일에 없습니다 (보안 원칙 준수).
// =====================================================

// ── DOM 요소 참조 (HTML에서 필요한 요소들을 미리 가져옵니다) ──

// 악플 판별 관련
const commentInput  = document.getElementById("comment-input");   // 댓글 입력창
const analyzeBtn    = document.getElementById("analyze-btn");      // 판별하기 버튼

// 결과 표시 영역 상태 패널들
const resultIdle    = document.getElementById("result-idle");      // 대기 상태
const resultLoading = document.getElementById("result-loading");   // 로딩 상태
const resultContent = document.getElementById("result-content");   // 판별 결과

// 신호등 전구
const redLight      = document.getElementById("red-light");
const greenLight    = document.getElementById("green-light");

// 강아지 캐릭터 SVG
const dogAngry      = document.getElementById("dog-angry");
const dogHappy      = document.getElementById("dog-happy");

// 결과 텍스트
const resultVerdict = document.getElementById("result-verdict");   // "악플입니다." / "악플이 아닙니다."
const resultReason  = document.getElementById("result-reason");    // AI 판별 이유
const retryMessage  = document.getElementById("retry-message");    // "다시 입력해주세요"

// 피드백 관련
const nicknameInput = document.getElementById("nickname-input");   // 닉네임 입력창
const feedbackInput = document.getElementById("feedback-input");   // 피드백 내용 입력창
const feedbackBtn   = document.getElementById("feedback-btn");     // 피드백 전송 버튼
const feedbackStatus = document.getElementById("feedback-status"); // 전송 결과 메시지
const feedbackList  = document.getElementById("feedback-list");    // 피드백 목록 컨테이너


// =====================================================
// ── 1. 악플 판별 기능 ──
// =====================================================

/**
 * 결과 영역의 상태를 전환하는 함수
 * @param {"idle" | "loading" | "result"} state - 보여줄 상태
 */
function showResultState(state) {
  // 먼저 세 가지 패널 모두 숨깁니다.
  resultIdle.classList.add("hidden");
  resultLoading.classList.add("hidden");
  resultContent.classList.add("hidden");

  // 요청한 상태의 패널만 보여줍니다.
  if (state === "idle")    resultIdle.classList.remove("hidden");
  if (state === "loading") resultLoading.classList.remove("hidden");
  if (state === "result")  resultContent.classList.remove("hidden");
}

/**
 * 판별 결과를 UI에 반영하는 함수
 * @param {boolean} isMalicious - true이면 악플, false이면 정상
 * @param {string} reason - AI가 설명하는 판별 이유
 */
function displayResult(isMalicious, reason) {
  // 먼저 신호등과 강아지를 초기화합니다 (이전 결과 제거).
  redLight.classList.remove("on");
  greenLight.classList.remove("on");
  dogAngry.classList.add("hidden");
  dogHappy.classList.add("hidden");
  retryMessage.classList.add("hidden");

  if (isMalicious) {
    // ── 악플인 경우 ──
    // 1. 빨간 경고등 점등 (깜빡임 효과 CSS로 처리됨)
    redLight.classList.add("on");

    // 2. 화난 강아지 표시
    dogAngry.classList.remove("hidden");

    // 3. 결과 문구 설정
    resultVerdict.textContent = "⚠️ 악플입니다.";
    resultVerdict.className = "result-verdict verdict-malicious"; // 빨간색 텍스트

  } else {
    // ── 악플이 아닌 경우 ──
    // 1. 초록불 점등
    greenLight.classList.add("on");

    // 2. 웃는 강아지 표시
    dogHappy.classList.remove("hidden");

    // 3. 결과 문구 설정
    resultVerdict.textContent = "✅ 악플이 아닙니다.";
    resultVerdict.className = "result-verdict verdict-clean"; // 초록색 텍스트

    // 4. "다시 입력해주세요" 안내 표시 + 입력창 초기화 후 포커스
    retryMessage.classList.remove("hidden");
    commentInput.value = "";
    commentInput.focus();
  }

  // AI가 설명한 이유를 화면에 표시합니다.
  resultReason.textContent = `💬 ${reason}`;

  // 결과 패널을 보여줍니다.
  showResultState("result");
}

/**
 * 판별하기 버튼 클릭 이벤트 핸들러
 */
analyzeBtn.addEventListener("click", async () => {
  const comment = commentInput.value.trim(); // 앞뒤 공백 제거

  // ── 입력 검증: 빈 댓글은 API 호출 없이 안내 메시지만 띄웁니다 ──
  if (!comment) {
    alert("댓글을 먼저 입력해주세요.");
    commentInput.focus();
    return; // 여기서 함수 종료 (API 호출 안 함)
  }

  // ── 로딩 상태 시작 ──
  analyzeBtn.disabled = true;           // 버튼 비활성화 (중복 클릭 방지)
  analyzeBtn.textContent = "분석 중..."; // 버튼 텍스트 변경
  showResultState("loading");           // 로딩 패널 표시

  try {
    // ── 서버리스 API 호출 (/api/analyze.js) ──
    // fetch()는 브라우저에서 서버로 HTTP 요청을 보내는 함수입니다.
    const response = await fetch("/api/analyze", {
      method: "POST",                            // POST 방식으로 요청
      headers: { "Content-Type": "application/json" }, // 데이터 형식 명시
      body: JSON.stringify({ comment }),         // 댓글 내용을 JSON으로 변환하여 전송
    });

    // 서버 응답을 JSON 객체로 변환합니다.
    const data = await response.json();

    if (!response.ok) {
      // 서버가 에러 응답을 보낸 경우 (400, 500 등)
      throw new Error(data.error || "분석 중 오류가 발생했습니다.");
    }

    // ── 판별 결과를 UI에 반영합니다 ──
    displayResult(data.isMalicious, data.reason);

  } catch (error) {
    // 네트워크 오류 또는 서버 에러 발생 시 사용자에게 안내합니다.
    console.error("판별 오류:", error);
    showResultState("idle");
    alert(`오류가 발생했습니다: ${error.message}`);
  } finally {
    // 성공/실패 여부 상관없이 버튼을 원래 상태로 복구합니다.
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "🔍 판별하기";
  }
});

// 엔터 키를 눌러도 판별이 실행되도록 합니다 (Ctrl+Enter 또는 Shift 없이 Enter).
commentInput.addEventListener("keydown", (e) => {
  // Ctrl+Enter 또는 단순 Enter(shift 없이)로 판별 실행
  if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
    e.preventDefault(); // 기본 줄바꿈 동작 방지
    analyzeBtn.click();
  }
});


// =====================================================
// ── 2. 피드백 기능 ──
// =====================================================

/**
 * 날짜를 "2026년 11월 11일 오후 1:30" 같은 한국어 형식으로 변환합니다.
 * @param {string} isoString - ISO 8601 날짜 문자열
 * @returns {string} 사람이 읽기 좋은 한국어 날짜 문자열
 */
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 피드백 카드 HTML 요소를 만들어 반환하는 함수
 * XSS(스크립트 삽입 공격) 방지를 위해 innerHTML 대신 textContent를 사용합니다.
 * @param {{ id, nickname, content, created_at }} feedback - 피드백 데이터
 * @returns {HTMLElement} 완성된 피드백 카드 DOM 요소
 */
function createFeedbackCard(feedback) {
  // 카드 최상위 div 생성
  const card = document.createElement("div");
  card.className = "feedback-card";

  // 카드 헤더 (닉네임 + 날짜)
  const header = document.createElement("div");
  header.className = "feedback-card-header";

  const nickname = document.createElement("span");
  nickname.className = "feedback-nickname";
  nickname.textContent = feedback.nickname || "익명"; // textContent → XSS 방지

  const date = document.createElement("span");
  date.className = "feedback-date";
  date.textContent = formatDate(feedback.created_at);

  header.appendChild(nickname);
  header.appendChild(date);

  // 피드백 내용
  const content = document.createElement("p");
  content.className = "feedback-content";
  content.textContent = feedback.content; // textContent → XSS 방지 (innerHTML 금지!)

  // 카드에 헤더와 내용을 추가합니다.
  card.appendChild(header);
  card.appendChild(content);

  return card;
}

/**
 * 피드백 목록을 화면에 렌더링하는 함수
 * @param {Array} feedbacks - 피드백 객체 배열 (최신순으로 이미 정렬된 상태)
 */
function renderFeedbacks(feedbacks) {
  // 기존 목록을 완전히 비웁니다.
  feedbackList.innerHTML = "";

  if (!feedbacks || feedbacks.length === 0) {
    // 피드백이 없으면 안내 문구를 표시합니다.
    const empty = document.createElement("p");
    empty.className = "no-feedback";
    empty.textContent = "아직 피드백이 없습니다. 첫 번째 피드백을 남겨보세요! 🐾";
    feedbackList.appendChild(empty);
    return;
  }

  // 피드백 배열을 순서대로 카드로 만들어 목록에 추가합니다.
  feedbacks.forEach((feedback) => {
    const card = createFeedbackCard(feedback);
    feedbackList.appendChild(card);
  });
}

/**
 * 서버에서 피드백 목록을 불러와 화면에 표시하는 함수
 */
async function loadFeedbacks() {
  try {
    // GET /api/feedback 호출 → Supabase에서 최신순으로 조회
    const response = await fetch("/api/feedback");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "피드백을 불러오지 못했습니다.");
    }

    // 받아온 피드백 목록을 화면에 렌더링합니다.
    renderFeedbacks(data.feedbacks);

  } catch (error) {
    console.error("피드백 로딩 오류:", error);
    feedbackList.innerHTML = `<p class="feedback-loading">피드백을 불러오는 중 오류가 발생했습니다.</p>`;
  }
}

/**
 * 피드백 전송 버튼 클릭 이벤트 핸들러
 */
feedbackBtn.addEventListener("click", async () => {
  const nickname = nicknameInput.value.trim();
  const content  = feedbackInput.value.trim();

  // ── 입력 검증: 피드백 내용이 비어있으면 전송하지 않습니다 ──
  if (!content) {
    feedbackStatus.textContent = "⚠️ 피드백 내용을 입력해주세요.";
    feedbackStatus.style.color = "#FACC15";
    feedbackInput.focus();
    return; // 함수 종료 (API 호출 안 함)
  }

  // ── 전송 중 버튼 비활성화 ──
  feedbackBtn.disabled = true;
  feedbackBtn.textContent = "전송 중...";
  feedbackStatus.textContent = "";

  try {
    // POST /api/feedback 호출 → Supabase에 저장
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, content }), // 닉네임과 내용 전송
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "피드백 전송에 실패했습니다.");
    }

    // ── 전송 성공 ──
    feedbackStatus.textContent = "✅ 피드백이 등록되었습니다! 감사합니다 🐾";
    feedbackStatus.style.color = "#FACC15";

    // 입력창을 초기화합니다.
    nicknameInput.value = "";
    feedbackInput.value = "";

    // 피드백 목록을 즉시 새로고침하여 방금 작성한 글이 맨 위에 보이도록 합니다.
    await loadFeedbacks();

  } catch (error) {
    console.error("피드백 전송 오류:", error);
    feedbackStatus.textContent = `❌ 오류: ${error.message}`;
    feedbackStatus.style.color = "#FCA5A5";
  } finally {
    // 성공/실패 상관없이 버튼을 원래 상태로 복구합니다.
    feedbackBtn.disabled = false;
    feedbackBtn.textContent = "💬 피드백 전송";
  }
});


// =====================================================
// ── 3. 페이지 로드 시 초기 실행 ──
// =====================================================
// 페이지가 완전히 로드되면 피드백 목록을 불러옵니다.
document.addEventListener("DOMContentLoaded", () => {
  loadFeedbacks();
});
