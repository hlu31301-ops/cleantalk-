// =====================================================
// app.js - CleanTalk 실시간 반응형 AI 악플 판별기
// 특징:
//   1. 신호등(빨간불/초록불) 시각 피드백
//   2. 살아 숨쉬며 타이핑/판별 결과에 따라 표정과 움직임이
//      실시간으로 동시에 바뀌는 강아지 인터랙션
//   3. 로그인 없는 서비스 피드백 (Supabase 연동)
// =====================================================

// ── 1. DOM 요소 가져오기 ──────────────────────────────

// 신호등 전구
const redLight        = document.getElementById("red-light");        // 🚨 빨간불 (악플 경고등)
const greenLight      = document.getElementById("green-light");      // 🟢 초록불 (착한댓글 안전등)

// 강아지 모션 및 표정 래퍼들
const dogIdleWrap     = document.getElementById("dog-idle-wrap");     // 평소 대기 / 타이핑
const dogIdleSvg      = document.getElementById("dog-idle-svg");      // 대기 SVG (고개 갸웃 모션 토글용)
const dogAnalyzingWrap= document.getElementById("dog-analyzing-wrap");// AI 분석 중 (꼬리 흔들기)
const dogAngryWrap    = document.getElementById("dog-angry-wrap");    // 악플 감지 (부들부들 분노 모션)
const dogHappyWrap    = document.getElementById("dog-happy-wrap");    // 착한 댓글 감지 (신나는 점프 모션)

// 강아지 말풍선
const bubbleText      = document.getElementById("bubble-text");

// 결과 문구 배너
const verdictBanner   = document.getElementById("verdict-banner");
const verdictTitle    = document.getElementById("verdict-title");
const verdictReason   = document.getElementById("verdict-reason");
const retryHint       = document.getElementById("retry-hint");

// 댓글 입력 요소
const commentInput    = document.getElementById("comment-input");
const analyzeBtn      = document.getElementById("analyze-btn");
const typingStatus    = document.getElementById("typing-status");

// 피드백 요소 (Supabase 연동)
const feedbackNickname= document.getElementById("feedback-nickname");
const feedbackContent = document.getElementById("feedback-content");
const feedbackBtn     = document.getElementById("feedback-submit-btn");
const feedbackStatus  = document.getElementById("feedback-status");
const feedbackList    = document.getElementById("feedback-list");


// ── 2. 강아지 실시간 모션 & 표정 제어 함수 ────────────

let typingTimer = null; // 타이핑 감지 타이머
let currentVerdictState = null; // 판별 완료 후 상태 유지용

/**
 * 강아지의 움직임(모션)과 얼굴 표정을 동시에 바꾸는 핵심 컨트롤러
 * @param {"idle" | "typing" | "analyzing" | "angry" | "happy"} state 
 * @param {string} customMessage - 말풍선에 띄울 커스텀 텍스트 (선택사항)
 */
function setDogState(state, customMessage = "") {
  // 1. 모든 강아지 레이어 숨기기
  dogIdleWrap.classList.add("hidden");
  dogAnalyzingWrap.classList.add("hidden");
  dogAngryWrap.classList.add("hidden");
  dogHappyWrap.classList.add("hidden");
  dogIdleSvg.classList.remove("dog-curious-motion");

  // 2. 상태별 모션 & 표정 & 말풍선 전환
  switch (state) {
    case "idle":
      // [평소 대기]: 부드럽게 숨쉬기 + 눈 깜빡임
      dogIdleWrap.classList.remove("hidden");
      bubbleText.textContent = customMessage || "댓글을 입력하시면 제가 실시간으로 지켜보며 판별해 드릴게요! 🐾";
      break;

    case "typing":
      // [타이핑 중]: 호기심 가득하게 고개를 좌우로 갸웃갸웃(Tilt)하며 지켜봄!
      dogIdleWrap.classList.remove("hidden");
      dogIdleSvg.classList.add("dog-curious-motion");
      bubbleText.textContent = customMessage || "어? 무슨 댓글을 쓰고 계신가요? 쫑긋쫑긋 지켜보는 중! 🐾";
      break;

    case "analyzing":
      // [AI 분석 중]: 맹렬하게 꼬리를 흔들며 돋보기로 집중 들여다보기
      dogAnalyzingWrap.classList.remove("hidden");
      bubbleText.textContent = customMessage || "AI와 함께 열심히 댓글을 분석하고 있어요! 꼬리 살랑살랑~ 🔍";
      break;

    case "angry":
      // [🚨 악플 감지]: 빨갛게 달아오른 볼 + 부들부들 분노 진동 모션
      dogAngryWrap.classList.remove("hidden");
      bubbleText.textContent = customMessage || "앗! 이런 악플은 다른 사람의 마음에 큰 상처를 줘요! 😡";
      break;

    case "happy":
      // [✅ 착한 댓글 감지]: 활짝 웃는 눈 + 신나서 통통 점프(Bounce) + 하트 뿜뿜
      dogHappyWrap.classList.remove("hidden");
      bubbleText.textContent = customMessage || "와아! 정말 따뜻하고 훌륭한 배려의 댓글이에요! 감동받았어요 💕";
      break;
  }
}

/**
 * 신호등 불 켜기/끄기 제어 함수
 * @param {"none" | "red" | "green"} lightColor 
 */
function setTrafficLight(lightColor) {
  redLight.classList.remove("on");
  greenLight.classList.remove("on");

  if (lightColor === "red") {
    redLight.classList.add("on"); // 🚨 빨간불 점등 (깜빡임 효과)
  } else if (lightColor === "green") {
    greenLight.classList.add("on"); // 🟢 초록불 점등 (안전 광채)
  }
}


// ── 3. 실시간 댓글창 인터랙션 (타이핑 감지) ─────────────

// 사용자가 댓글창에 글자를 입력할 때마다 실시간으로 반응합니다.
commentInput.addEventListener("input", () => {
  const text = commentInput.value.trim();

  // 이미 판별 결과가 나와있는 상태에서 새로 글을 쓰기 시작하면 결과창 초기화
  if (currentVerdictState) {
    verdictBanner.classList.add("hidden");
    setTrafficLight("none");
    currentVerdictState = null;
  }

  if (text.length > 0) {
    // 글을 작성 중이면 강아지가 고개를 갸웃갸웃거리며 반응합니다!
    setDogState("typing");
    typingStatus.textContent = "🐾 강아지가 집중해서 읽고 있어요...";

    // 사용자가 입력을 멈추고 1.5초가 지나면 다시 편안한 숨쉬기 모션으로 복귀
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      setDogState("idle", "댓글 입력을 마치셨다면 아래 [판별하기] 버튼을 눌러주세요!");
      typingStatus.textContent = "";
    }, 1500);
  } else {
    // 입력창이 비어있으면 기본 대기 모션
    setDogState("idle");
    typingStatus.textContent = "";
  }
});

// 엔터 키 입력 시 판별 실행 (Shift+Enter는 줄바꿈)
commentInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    analyzeBtn.click();
  }
});


// ── 4. 악플 판별 실행 로직 (/api/analyze) ────────────

analyzeBtn.addEventListener("click", async () => {
  const comment = commentInput.value.trim();

  // 빈 댓글 검증
  if (!comment) {
    alert("댓글을 먼저 입력해 주세요!");
    commentInput.focus();
    return;
  }

  // 1. 로딩 상태 시작: 신호등 끄고, 분석 중 꼬리 흔들기 모션 시작
  clearTimeout(typingTimer);
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "분석 중...";
  setTrafficLight("none");
  verdictBanner.classList.add("hidden");
  retryHint.classList.add("hidden");
  setDogState("analyzing");

  try {
    // 2. 서버리스 API 호출 (/api/analyze) -> OpenAI gpt-4o-mini
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "분석 중 오류가 발생했습니다.");
    }

    currentVerdictState = data.isMalicious;

    // 3. 판별 결과에 따른 실시간 모션 + 표정 + 신호등 동시 제어
    if (data.isMalicious === true) {
      // 🚨 [악플인 경우]
      // (1) 신호등 빨간불 점등
      setTrafficLight("red");
      // (2) 강아지 분노 진동 모션 + 화난 얼굴
      setDogState("angry", `경고! ${data.reason || "상대방을 비하하는 악성 표현이 감지되었습니다."}`);
      // (3) 결과 배너 표시
      verdictBanner.className = "verdict-banner verdict-malicious";
      verdictTitle.textContent = "⚠️ 악플입니다.";
      verdictReason.textContent = `사유: ${data.reason}`;
      verdictBanner.classList.remove("hidden");

    } else {
      // ✅ [착한 댓글인 경우]
      // (1) 신호등 초록불 점등
      setTrafficLight("green");
      // (2) 강아지 통통 점프 모션 + 웃는 얼굴 + 하트
      setDogState("happy", `통과! ${data.reason || "비방이나 욕설이 없는 따뜻한 문장입니다."}`);
      // (3) 결과 배너 표시
      verdictBanner.className = "verdict-banner verdict-clean";
      verdictTitle.textContent = "✅ 악플이 아닙니다.";
      verdictReason.textContent = `분석: ${data.reason}`;
      retryHint.classList.remove("hidden");
      verdictBanner.classList.remove("hidden");

      // 입력창 초기화 후 다시 입력할 수 있도록 유도
      commentInput.value = "";
      commentInput.focus();
    }

  } catch (error) {
    console.error("판별 오류:", error);
    setDogState("idle", `오류가 발생했습니다: ${error.message}`);
    alert(`오류가 발생했습니다: ${error.message}`);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "🔍 판별하기";
  }
});


// ── 5. 하단 서비스 피드백 기능 (Supabase 연동) ────────

/**
 * 날짜를 사람이 읽기 좋은 형식으로 변환 (XSS 방지용)
 */
function formatFeedbackDate(isoString) {
  if (!isoString) return "방금 전";
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
 * 피드백 카드 DOM 요소를 생성 (textContent 철저 사용으로 XSS 차단)
 */
function createFeedbackCard(item) {
  const card = document.createElement("div");
  card.className = "feedback-card";

  const header = document.createElement("div");
  header.className = "feedback-card-header";

  const nickname = document.createElement("span");
  nickname.className = "feedback-nickname";
  nickname.textContent = `🐾 ${item.nickname || "익명"}`;

  const date = document.createElement("span");
  date.className = "feedback-date";
  date.textContent = formatFeedbackDate(item.created_at);

  header.appendChild(nickname);
  header.appendChild(date);

  const content = document.createElement("p");
  content.className = "feedback-content";
  content.textContent = item.content;

  card.appendChild(header);
  card.appendChild(content);

  return card;
}

/**
 * 피드백 목록을 Supabase로부터 불러와 화면에 표시
 */
async function loadFeedbacks() {
  try {
    const response = await fetch("/api/feedback");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "피드백을 불러오지 못했습니다.");
    }

    const feedbacks = data.feedbacks || [];
    feedbackList.innerHTML = "";

    if (feedbacks.length === 0) {
      feedbackList.innerHTML = `<p class="no-feedback">아직 피드백이 없습니다. 첫 번째 응원의 글을 남겨보세요! 🐾</p>`;
      return;
    }

    feedbacks.forEach((item) => {
      const card = createFeedbackCard(item);
      feedbackList.appendChild(card);
    });

  } catch (error) {
    console.error("피드백 로드 오류:", error);
    feedbackList.innerHTML = `<p class="feedback-loading">피드백을 불러오는 중 문제가 발생했습니다.</p>`;
  }
}

/**
 * 피드백 전송 버튼 클릭 핸들러
 */
feedbackBtn.addEventListener("click", async () => {
  const nickname = feedbackNickname.value.trim();
  const content  = feedbackContent.value.trim();

  if (!content) {
    feedbackStatus.textContent = "⚠️ 피드백 내용을 입력해주세요.";
    feedbackStatus.style.color = "#EF4444";
    feedbackContent.focus();
    return;
  }

  feedbackBtn.disabled = true;
  feedbackBtn.textContent = "전송 중...";
  feedbackStatus.textContent = "";

  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, content }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "피드백 전송에 실패했습니다.");
    }

    // 전송 성공 시 입력창 초기화 및 목록 갱신
    feedbackStatus.textContent = "✅ 소중한 피드백이 등록되었습니다! 감사합니다 🐾";
    feedbackStatus.style.color = "#0B4F28";
    feedbackNickname.value = "";
    feedbackContent.value = "";

    await loadFeedbacks();

  } catch (error) {
    console.error("피드백 전송 오류:", error);
    feedbackStatus.textContent = `❌ 오류: ${error.message}`;
    feedbackStatus.style.color = "#EF4444";
  } finally {
    feedbackBtn.disabled = false;
    feedbackBtn.textContent = "💬 피드백 전송";
  }
});


// ── 6. 페이지 로드 초기화 ────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setDogState("idle");     // 강아지 평소 숨쉬기 모션으로 시작
  setTrafficLight("none"); // 신호등 초기화
  loadFeedbacks();         // 피드백 목록 불러오기
});
