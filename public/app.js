// =====================================================
// app.js - CleanTalk 실시간 클린 댓글창 프론트엔드 로직
// 역할:
//   1. 사용자가 댓글 작성 후 [등록] 클릭
//   2. AI가 실시간으로 악플인지 판별 (/api/analyze)
//   3. [악플이면] -> 등록 차단! 붉은 경고창과 사유 표시
//   4. [클린하면] -> 통과! Supabase DB에 저장하고 실시간 목록 갱신
// =====================================================

// ── 1. DOM 요소 가져오기 ──────────────────────────────
// 사용자 입력 요소
const nicknameInput    = document.getElementById("nickname-input");    // 닉네임 입력창
const commentInput     = document.getElementById("comment-input");     // 댓글 본문 입력창
const submitBtn        = document.getElementById("submit-btn");        // 댓글 등록 버튼
const btnText          = document.getElementById("btn-text");          // 버튼 내부 텍스트
const commentCard      = document.querySelector(".comment-input-card"); // 입력 카드 컨테이너

// AI 실시간 알림 패널들
const noticeLoading    = document.getElementById("notice-loading");    // 분석 중 로딩 박스
const noticeWarning    = document.getElementById("notice-warning");    // 🚨 악플 차단 경고 박스
const warningReason    = document.getElementById("warning-reason");    // 악플 차단 사유 텍스트
const closeWarningBtn  = document.getElementById("close-warning-btn");  // 경고창 닫기 버튼
const noticeSuccess    = document.getElementById("notice-success");    // ✅ 등록 성공 박스
const successReason    = document.getElementById("success-reason");    // 성공 메시지 텍스트

// 실시간 댓글 목록 요소
const commentsCount    = document.getElementById("comments-count");    // 댓글 개수 뱃지
const commentsList     = document.getElementById("comments-list");     // 댓글 목록 렌더링 영역
const refreshBtn       = document.getElementById("refresh-btn");       // 새로고침 버튼


// ── 2. 유틸리티 함수들 ───────────────────────────────

/**
 * 모든 알림 박스를 화면에서 숨기는 함수
 */
function hideAllNotices() {
  noticeLoading.classList.add("hidden");
  noticeWarning.classList.add("hidden");
  noticeSuccess.classList.add("hidden");
  commentCard.classList.remove("warning-border");
}

/**
 * 날짜 문자열을 읽기 쉬운 한국어 형식으로 변환합니다.
 * 예: "2026. 11. 11. 오후 3:30"
 * @param {string} isoString - ISO 형식 날짜 문자열
 * @returns {string} 변환된 날짜 문자열
 */
function formatTime(isoString) {
  if (!isoString) return "방금 전";
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 댓글 1개의 HTML 카드 요소를 만듭니다.
 * XSS(악성 스크립트 삽입) 방지를 위해 innerHTML 대신 textContent를 철저히 사용합니다.
 * @param {{ id, nickname, content, created_at }} item - 댓글 데이터
 * @param {boolean} isNew - 방금 작성된 새 댓글인지 여부 (애니메이션 적용)
 * @returns {HTMLElement} 완성된 댓글 카드 요소
 */
function createCommentCard(item, isNew = false) {
  const card = document.createElement("div");
  card.className = isNew ? "comment-card new-item" : "comment-card";

  // 강아지 프로필 아바타 아이콘
  const avatar = document.createElement("div");
  avatar.className = "comment-avatar";
  avatar.textContent = "🐾";

  // 댓글 본체 (메타 정보 + 내용)
  const body = document.createElement("div");
  body.className = "comment-body";

  // 작성자 정보 행
  const meta = document.createElement("div");
  meta.className = "comment-meta";

  const nickname = document.createElement("span");
  nickname.className = "comment-nickname";
  nickname.textContent = item.nickname || "익명";

  // AI 클린 인증 뱃지
  const badge = document.createElement("span");
  badge.className = "clean-badge";
  badge.textContent = "AI 클린인증 🛡️";

  const time = document.createElement("span");
  time.className = "comment-time";
  time.textContent = formatTime(item.created_at);

  meta.appendChild(nickname);
  meta.appendChild(badge);
  meta.appendChild(time);

  // 댓글 본문 내용 (textContent로 안전하게 처리)
  const content = document.createElement("p");
  content.className = "comment-text";
  content.textContent = item.content;

  body.appendChild(meta);
  body.appendChild(content);

  card.appendChild(avatar);
  card.appendChild(body);

  return card;
}


// ── 3. 실시간 댓글 목록 불러오기 ────────────────────

/**
 * Supabase DB에서 최신 댓글 목록을 가져와 화면에 표시합니다.
 */
async function loadComments() {
  try {
    // /api/feedback API를 호출하여 최신순으로 정렬된 데이터를 받아옵니다.
    const response = await fetch("/api/feedback");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "댓글을 불러오는데 실패했습니다.");
    }

    const items = data.feedbacks || [];
    commentsCount.textContent = items.length; // 댓글 개수 업데이트

    // 목록 컨테이너 비우기
    commentsList.innerHTML = "";

    if (items.length === 0) {
      // 등록된 댓글이 없을 때
      commentsList.innerHTML = `
        <div class="no-comments">
          <p>아직 등록된 댓글이 없습니다. 첫 번째 클린 댓글을 남겨보세요! 🐾</p>
        </div>
      `;
      return;
    }

    // 각 댓글을 카드로 만들어 화면에 추가
    items.forEach((item) => {
      const cardElement = createCommentCard(item, false);
      commentsList.appendChild(cardElement);
    });

  } catch (error) {
    console.error("댓글 불러오기 오류:", error);
    commentsList.innerHTML = `
      <div class="comments-loading">
        <p>⚠️ 댓글을 불러오는 중 문제가 발생했습니다: ${error.message}</p>
      </div>
    `;
  }
}


// ── 4. 댓글 등록 및 실시간 악플 검사 핸들러 ─────────

/**
 * 댓글 등록 버튼을 눌렀을 때 실행되는 메인 로직입니다.
 */
async function handleCommentSubmit() {
  const nickname = nicknameInput.value.trim() || "익명";
  const comment  = commentInput.value.trim();

  // (1) 빈 댓글 검증
  if (!comment) {
    alert("댓글 내용을 입력해 주세요!");
    commentInput.focus();
    return;
  }

  // (2) 알림창 초기화 및 로딩 시작
  hideAllNotices();
  noticeLoading.classList.remove("hidden"); // AI 분석 중 로딩 박스 표시
  submitBtn.disabled = true;                // 버튼 비활성화 (중복 클릭 방지)
  btnText.textContent = "AI 실시간 검사 중...";

  try {
    // (3) STEP 1: AI 악플 실시간 판별 (/api/analyze)
    const analyzeResponse = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });

    const analyzeResult = await analyzeResponse.json();

    if (!analyzeResponse.ok) {
      throw new Error(analyzeResult.error || "AI 분석 중 오류가 발생했습니다.");
    }

    // 로딩 숨기기
    noticeLoading.classList.add("hidden");

    // (4) STEP 2: 판별 결과 분기 처리
    if (analyzeResult.isMalicious === true) {
      // 🚨 [악플로 판정된 경우] -> 등록 차단!
      console.warn("악성 댓글 차단됨:", comment);

      // 경고 사유 표시
      warningReason.textContent = `사유: ${analyzeResult.reason || "타인에 대한 비방이나 부적절한 표현이 포함되어 있습니다."}`;
      noticeWarning.classList.remove("hidden");

      // 입력창에 빨간 테두리 및 흔들림 애니메이션 효과
      commentCard.classList.add("warning-border");

      // 댓글 등록 중단 (DB로 보내지 않고 여기서 종료)
      commentInput.focus();
      return;
    }

    // ✅ [클린한 댓글로 판정된 경우] -> STEP 3: DB에 저장 (/api/feedback)
    const saveResponse = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: nickname,
        content: comment,
      }),
    });

    const saveResult = await saveResponse.json();

    if (!saveResponse.ok) {
      throw new Error(saveResult.error || "댓글 저장에 실패했습니다.");
    }

    // 성공 배너 표시
    successReason.textContent = `"${analyzeResult.reason || '건전하고 따뜻한 댓글입니다.'}"`;
    noticeSuccess.classList.remove("hidden");

    // 입력창 초기화
    commentInput.value = "";

    // 실시간 댓글 목록 새로고침 (방금 쓴 글이 맨 위에 즉시 반영됨)
    await loadComments();

    // 4초 후 성공 배너 부드럽게 닫기
    setTimeout(() => {
      noticeSuccess.classList.add("hidden");
    }, 4000);

  } catch (error) {
    console.error("댓글 처리 중 오류:", error);
    noticeLoading.classList.add("hidden");
    alert(`오류가 발생했습니다: ${error.message}`);
  } finally {
    // 버튼 상태 원래대로 복구
    submitBtn.disabled = false;
    btnText.textContent = "🚀 댓글 등록하기";
  }
}


// ── 5. 이벤트 리스너 등록 ────────────────────────────

// 댓글 등록 버튼 클릭 시
submitBtn.addEventListener("click", handleCommentSubmit);

// 댓글 입력창에서 Enter 키를 누르면 등록 (단, Shift + Enter는 줄바꿈)
commentInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault(); // 기본 개행 방지
    handleCommentSubmit();
  }
});

// 경고 배너 닫기 버튼 클릭 시
closeWarningBtn.addEventListener("click", () => {
  noticeWarning.classList.add("hidden");
  commentCard.classList.remove("warning-border");
});

// 수동 새로고침 버튼 클릭 시
refreshBtn.addEventListener("click", () => {
  loadComments();
});

// 페이지가 처음 열렸을 때 댓글 목록 자동 로드
document.addEventListener("DOMContentLoaded", () => {
  loadComments();
});
