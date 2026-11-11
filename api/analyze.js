// =====================================================
// /api/analyze.js - 정밀 AI 악플 판별 & 순화 서버리스 함수
// 개선 사항:
//   - 성희롱 및 성적 수치심 유발 단어/표현을 명백한 부적절(악플)로 엄격히 추가
//   - 성적 대상화, 음란성 비하, 신체 관련 성적 조롱 감지 규칙 강화
//   - 특수문자/이모티콘 오탐 방지 규칙 유지
// =====================================================

import OpenAI from "openai";

export default async function handler(req, res) {
  // POST 요청만 허용합니다.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  const { comment } = req.body;

  // 빈 댓글 검증
  if (!comment || comment.trim() === "") {
    return res.status(400).json({ error: "댓글 내용을 입력해주세요." });
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // OpenAI gpt-4o-mini 모델에게 정밀 악플 판별 및 순화 요청
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.1, // 일관되고 객관적인 판별을 위해 온도를 낮춤
      messages: [
        {
          role: "system",
          content: `너는 한국어 인터넷 댓글의 악성 여부를 공정하고 엄격하게 판별하는 AI 콘텐츠 모더레이션 전문가이다.
반드시 아래 기준을 준수하여 JSON 형식으로만 응답하라.

───────────────────────────────────────────────────────
[1. 악플 및 부적절한 표현 판정 기준 (isMalicious: true)]
다음 중 하나라도 해당되면 반드시 isMalicious를 true로 판정하고 높은 위험도(70~100)를 부여한다:

1) ★ 성희롱 및 성적 수치심 유발 (최우선 차단 대상) ★:
   - 상대방에게 성적 수치심, 불쾌감, 굴욕감을 주는 언어적 성희롱
   - 신체 부위에 대한 음란한 평가, 성적 대상화, 조롱, 희롱
   - 음란한 비속어, 성행위 연상 표현, 성적 비하 단어
   - 성별 혐오 표현 및 왜곡된 성적 비방

2) 욕설, 비속어 및 인신공격:
   - 타인을 향한 직접적인 욕설, 심한 비속어, 인격 모독, 조롱, 비하, 협박
   - 욕설 필터링을 우회한 변칙 표현(예: "ㅅ1ㅂ", "ㅂ@ㅅ", "개1새1끼" 등)이 명백한 경우

───────────────────────────────────────────────────────
[2. 정상(클린) 판정 예외 규칙 (isMalicious: false)]
다음의 경우는 특수문자가 포함되어 있더라도 악의나 성적 불쾌감이 없다면 정상적인 표현으로 판정한다:
1) 감정 표현 이모티콘: "^^", "ㅠㅠ", "ㅜㅜ", "ㅎㅎ", "ㅋㅋ", "*^^*", "(^-^)", "@_@", ";;", "ㅇㅅㅇ" 등
2) 단순 문장부호 및 기호: "!", "?", "~", "...", "*", "#", "-", "/" 등
3) 긍정적 감탄 및 일상 대화:
   - "와 대박 ㅠㅠ 너무 감동이에요!!" → 정상 (isMalicious: false, toxicityScore: 0)
   - "선생님 정말 감사합니다 ^^~" → 정상 (isMalicious: false, toxicityScore: 0)
   - "와 미쳤다 ㅋㅋㅋㅋ 진짜 잘 만드셨네요" → 칭찬 감탄사이므로 정상 (isMalicious: false, toxicityScore: 5)

───────────────────────────────────────────────────────
[3. 응답 JSON 스키마]
{
  "isMalicious": boolean, // 악플/성희롱/부적절 표현이면 true, 정상/클린 문장이면 false
  "toxicityScore": number, // 0~100 사이의 위험도 점수 (정상은 0~10, 성희롱/욕설은 80~100)
  "reason": string, // 판별 사유 (예: "상대방에게 성적 수치심을 유발하는 부적절한 성희롱 표현이 포함되어 있습니다.")
  "tags": string[], // 감지된 성격 태그 1~3개 (예: ["#성희롱", "#성적수치심", "#부적절표현"] 또는 ["#따뜻한응원", "#배려"])
  "suggestedCleanText": string // 악플인 경우 타인에게 상처 주지 않고 정중하게 순화한 대체 문장 (성희롱의 경우 "상대방을 존중하는 따뜻한 언어를 사용해 주세요." 등으로 권고)
}

───────────────────────────────────────────────────────
[4. 순화 문장(suggestedCleanText) 작성 원칙]
- 원래 전달하려던 피드백의 취지는 살리되, 비난·조롱·욕설·성희롱을 완전히 배제하고 상호 존중하는 정중하고 따뜻한 어조로 바꿀 것.
- 성희롱 및 성적 수치심 표현은 순화가 불가능하므로, "상대방을 존중하는 배려의 말을 사용해 주세요."와 같은 권고 문장을 제시할 것.`,
        },
        {
          role: "user",
          content: `다음 댓글을 판별하고 분석해줘: "${comment}"`,
        },
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content);

    return res.status(200).json(result);
  } catch (error) {
    console.error("OpenAI API 호출 에러:", error);
    return res.status(500).json({ error: "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
  }
}
