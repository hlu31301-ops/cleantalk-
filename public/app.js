// =====================================================
// app.js - CleanTalk 프리미엄 반응형 AI 악플 판별기
// 핵심 기능:
//   1. 🌙 원클릭 다크 모드 토글 및 자동 저장 (LocalStorage)
//   2. 신호등(빨간불/초록불) 시각 피드백
//   3. 살아 숨쉬며 타이핑/판별 결과에 반응하는 인터랙티브 강아지
//   4. 악플 위험도 게이지 바 (0~100%) & AI 분석 태그
//   5. 🪄 AI 예쁜 말 순화기 (대체 문장 제안 & 원클릭 교체)
//   6. 🏆 클린 지킴이 연속 착한 댓글 뱃지 시스템
//   7. 📊 실시간 클린 현황판 (오늘 판별/차단/통과 통계)
//   8. Supabase 실시간 피드백 연동
// =====================================================

// ── 1. DOM 요소 가져오기 ──────────────────────────────

// 🌙 다크 모드 토글
const themeToggleBtn  = document.getElementById("theme-toggle-btn");
const themeIcon       = document.getElementById("theme-icon");
const themeText       = document.getElementById("theme-text");

// 신호등 전구
const redLight        = document.getElementById("red-light");
const greenLight      = document.getElementById("green-light");

// 강아지 모션 및 표정 래퍼들
const dogIdleWrap     = document.getElementById("dog-idle-wrap");
const dogIdleSvg      = document.getElementById("dog-idle-svg");
const dogAnalyzingWrap= document.getElementById("dog-analyzing-wrap");
const dogAngryWrap    = document.getElementById("dog-angry-wrap");
const dogHappyWrap    = document.getElementById("dog-happy-wrap");
const bubbleText      = document.getElementById("bubble-text");

// 결과 영역
const verdictBanner   = document.getElementById("verdict-banner");
const verdictTitle    = document.getElementById("verdict-title");
const verdictReason   = document.getElementById("verdict-reason");
const retryHint       = document.getElementById("retry-hint");

// 📊 위험도 게이지 & 태그
const gaugeScore      = document.getElementById("gauge-score");
const gaugeFill       = document.getElementById("gauge-fill");
const resultTags      = document.getElementById("result-tags");

// 🪄 AI 예쁜 말 순화기
const cleanSuggestCard= document.getElementById("clean-suggest-card");
const suggestText     = document.getElementById("suggest-text");
const applyCleanBtn   = document.getElementById("apply-clean-btn");

// 🏆 클린 지킴이 뱃지 칩
const badgeIcon       = document.getElementById("badge-icon");
const badgeTitle      = document.getElementById("badge-title");
const badgeStreak     = document.getElementById("badge-streak");

// 📊 실시간 현황판 카운터
const statTotal       = document.getElementById("stat-total");
const statMalicious   = document.getElementById("stat-malicious");
const statClean       = document.getElementById("stat-clean");

// 댓글 입력 요소
const commentInput    = document.getElementById("comment-input");
const analyzeBtn      = document.getElementById("analyze-btn");
const typingStatus    = document.getElementById("typing-status");

// 피드백 요소
const feedbackNickname= document.getElementById("feedback-nickname");
const feedbackContent = document.getElementById("feedback-content");
const feedbackBtn     = document.getElementById("feedback-submit-btn");
const feedbackStatus  = document.getElementById("feedback-status");
const feedbackList    = document.getElementById("feedback-list");


// ── 2. 🌙 다크 모드 제어 로직 ─────────────────────────

/**
 * 테마를 적용하고 LocalStorage에 저장하는 함수
 * @param {"dark" | "light"} theme 
 */
function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    themeIcon.textContent = "☀️";
    themeText.textContent = "라이트 모드";
    localStorage.setItem("cleantalk_theme", "dark");
  } else {
    document.body.classList.remove("dark-mode");
    themeIcon.textContent = "🌙";
    themeText.textContent = "다크 모드";
    localStorage.setItem("cleantalk_theme", "light");
  }
}

/**
 * 페이지 로드 시 저장된 테마 또는 시스템 기본 설정 불러오기
 */
function initTheme() {
  const savedTheme = localStorage.getItem("cleantalk_theme");
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    // 사용자의 OS/브라우저가 다크 모드인지 확인
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }
}

// 다크 모드 토글 버튼 클릭 이벤트
themeToggleBtn.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark-mode");
  applyTheme(isDark ? "light" : "dark");
});


// ── 3. 로컬 통계 & 뱃지 시스템 (LocalStorage) ─────────

function getStorageData() {
  const stats = JSON.parse(localStorage.getItem("cleantalk_stats") || '{"total":0,"malicious":0,"clean":0}');
  const streak = parseInt(localStorage.getItem("cleantalk_streak") || "0", 10);
  return { stats, streak };
}

function updateBadgeUI(streak) {
  badgeStreak.textContent = `(${streak}회 연속)`;

  if (streak === 0) {
    badgeIcon.textContent = "🌱";
    badgeTitle.textContent = "새싹 지킴이";
  } else if (streak < 3) {
    badgeIcon.textContent = "🥉";
    badgeTitle.textContent = "브론즈 지킴이";
  } else if (streak < 5) {
    badgeIcon.textContent = "🥈";
    badgeTitle.textContent = "실버 지킴이";
  } else {
    badgeIcon.textContent = "🥇";
    badgeTitle.textContent = "명예 마스터";
  }
}

function updateStatsUI(stats) {
  statTotal.textContent = stats.total;
  statMalicious.textContent = stats.malicious;
  statClean.textContent = stats.clean;
}


// ── 4. 강아지 모션 & 신호등 제어 함수 ─────────────────

let typingTimer = null;
let currentVerdictState = null;

function setDogState(state, customMessage = "") {
  dogIdleWrap.classList.add("hidden");
  dogAnalyzingWrap.classList.add("hidden");
  dogAngryWrap.classList.add("hidden");
  dogHappyWrap.classList.add("hidden");
  dogIdleSvg.classList.remove("dog-curious-motion");

  switch (state) {
    case "idle":
      dogIdleWrap.classList.remove("hidden");
      bubbleText.textContent = customMessage || "댓글을 입력하시면 제가 실시간으로 지켜보며 판별해 드릴게요! 🐾";
      break;

    case "typing":
      dogIdleWrap.classList.remove("hidden");
      dogIdleSvg.classList.add("dog-curious-motion");
      bubbleText.textContent = customMessage || "어? 무슨 댓글을 쓰고 계신가요? 쫑긋쫑긋 지켜보는 중! 🐾";
      break;

    case "analyzing":
      dogAnalyzingWrap.classList.remove("hidden");
      bubbleText.textContent = customMessage || "AI와 함께 열심히 댓글을 분석하고 있어요! 꼬리 살랑살랑~ 🔍";
      break;

    case "angry":
      dogAngryWrap.classList.remove("hidden");
      bubbleText.textContent = customMessage || "앗! 이런 악플은 다른 사람의 마음에 큰 상처를 줘요! 😡";
      break;

    case "happy":
      dogHappyWrap.classList.remove("hidden");
      bubbleText.textContent = customMessage || "와아! 정말 따뜻하고 훌륭한 배려의 댓글이에요! 감동받았어요 💕";
      break;
  }
}

function setTrafficLight(lightColor) {
  redLight.classList.remove("on");
  greenLight.classList.remove("on");

  if (lightColor === "red") {
    redLight.classList.add("on");
  } else if (lightColor === "green") {
    greenLight.classList.add("on");
  }
}


// ── 5. 타이핑 인터랙션 ────────────────────────────────

commentInput.addEventListener("input", () => {
  const text = commentInput.value.trim();

  if (currentVerdictState) {
    verdictBanner.classList.add("hidden");
    setTrafficLight("none");
    currentVerdictState = null;
  }

  if (text.length > 0) {
    setDogState("typing");
    typingStatus.textContent = "🐾 강아지가 집중해서 읽고 있어요...";

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      setDogState("idle", "댓글 입력을 마치셨다면 아래 [판별하기] 버튼을 눌러주세요!");
      typingStatus.textContent = "";
    }, 1500);
  } else {
    setDogState("idle");
    typingStatus.textContent = "";
  }
});

commentInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    analyzeBtn.click();
  }
});


// ── 6. 악플 판별 & 순화 실행 로직 (/api/analyze) ──────

analyzeBtn.addEventListener("click", async () => {
  const comment = commentInput.value.trim();

  if (!comment) {
    alert("댓글을 먼저 입력해 주세요!");
    commentInput.focus();
    return;
  }

  clearTimeout(typingTimer);
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "분석 중...";
  setTrafficLight("none");
  verdictBanner.classList.add("hidden");
  cleanSuggestCard.classList.add("hidden");
  retryHint.classList.add("hidden");
  setDogState("analyzing");

  try {
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

    // 위험도 게이지 바 애니메이션
    const score = Math.max(0, Math.min(100, Math.round(data.toxicityScore || (data.isMalicious ? 85 : 10))));
    gaugeScore.textContent = `${score}%`;
    gaugeFill.style.width = `${score}%`;

    if (score >= 70) {
      gaugeFill.style.backgroundColor = "var(--status-red)";
      gaugeScore.style.color = "var(--status-red)";
    } else if (score >= 35) {
      gaugeFill.style.backgroundColor = "var(--status-yellow)";
      gaugeScore.style.color = "var(--status-yellow)";
    } else {
      gaugeFill.style.backgroundColor = "var(--status-green)";
      gaugeScore.style.color = "var(--status-green)";
    }

    // 감지 태그 렌더링
    resultTags.innerHTML = "";
    const tags = data.tags && data.tags.length > 0 
      ? data.tags 
      : (data.isMalicious ? ["#악성표현", "#주의필요"] : ["#클린댓글", "#따뜻한소통"]);
    
    tags.forEach(tag => {
      const tagSpan = document.createElement("span");
      tagSpan.className = data.isMalicious ? "tag-badge tag-malicious" : "tag-badge tag-clean";
      tagSpan.textContent = tag.startsWith("#") ? tag : `#${tag}`;
      resultTags.appendChild(tagSpan);
    });

    // 통계 & 뱃지 갱신
    const storage = getStorageData();
    storage.stats.total += 1;

    if (data.isMalicious === true) {
      storage.stats.malicious += 1;
      storage.streak = 0;

      setTrafficLight("red");
      setDogState("angry", `경고! ${data.reason || "악성 표현이 감지되었습니다."}`);

      verdictBanner.className = "verdict-banner verdict-malicious";
      verdictTitle.textContent = "⚠️ 악플입니다.";
      verdictReason.textContent = `사유: ${data.reason}`;

      // 예쁜 말 순화기 제안
      if (data.suggestedCleanText) {
        suggestText.textContent = `"${data.suggestedCleanText}"`;
        cleanSuggestCard.classList.remove("hidden");

        applyCleanBtn.onclick = () => {
          commentInput.value = data.suggestedCleanText;
          cleanSuggestCard.classList.add("hidden");
          setDogState("idle", "✨ 예쁜 말로 바꿔주셔서 감사해요! 이제 다시 [판별하기]를 눌러보세요!");
          commentInput.focus();
        };
      }

    } else {
      storage.stats.clean += 1;
      storage.streak += 1;

      setTrafficLight("green");
      setDogState("happy", `통과! ${data.reason || "따뜻하고 긍정적인 문장입니다."}`);

      verdictBanner.className = "verdict-banner verdict-clean";
      verdictTitle.textContent = "✅ 악플이 아닙니다.";
      verdictReason.textContent = `분석: ${data.reason}`;
      retryHint.classList.remove("hidden");

      commentInput.value = "";
      commentInput.focus();
    }

    localStorage.setItem("cleantalk_stats", JSON.stringify(storage.stats));
    localStorage.setItem("cleantalk_streak", storage.streak.toString());
    updateStatsUI(storage.stats);
    updateBadgeUI(storage.streak);

    verdictBanner.classList.remove("hidden");

  } catch (error) {
    console.error("판별 오류:", error);
    setDogState("idle", `오류가 발생했습니다: ${error.message}`);
    alert(`오류가 발생했습니다: ${error.message}`);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "🔍 판별하기";
  }
});


// ── 7. 하단 서비스 피드백 기능 (Supabase 연동) ────────

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

    feedbackStatus.textContent = "✅ 소중한 피드백이 등록되었습니다! 감사합니다 🐾";
    feedbackStatus.style.color = "var(--primary-green)";
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


// ── 8. 페이지 로드 초기화 ────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // 다크 모드 설정 불러오기
  initTheme();

  setDogState("idle");
  setTrafficLight("none");
  
  // 통계 및 뱃지 데이터 로드
  const storage = getStorageData();
  updateStatsUI(storage.stats);
  updateBadgeUI(storage.streak);

  // 피드백 목록 로드
  loadFeedbacks();
});
