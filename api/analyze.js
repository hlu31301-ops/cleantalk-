// =====================================================
// /api/analyze.js - 정밀 AI 악플 판별 & 순화 서버리스 함수
// 개선 사항:
//   - 특수문자, 이모티콘(^^, ㅠㅠ, ㅎㅎ, ㅋㅋ, ~ 등) 오탐 방지 규칙 강화
//   - 실제 악의(욕설, 인신공격, 조롱, 혐오)가 있는 문장만 정확히 타겟팅
//   - 칭찬/감탄/단순 감정 표현에 대한 퓨샷(Few-shot) 가이드라인 탑재
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
          content: `너는 한국어 인터넷 댓글의 악성 여부를 공정하고 정확하게 판별하는 AI 콘텐츠 모더레이션 전문가이다.
반드시 아래 기준을 엄격히 준수하여 JSON 형식으로만 응답하라.

───────────────────────────────────────────────────────
[1. 악플 판정 기준 (isMalicious: true)]
- 타인을 향한 직접적인 욕설, 심한 비속어, 인신공격, 조롱, 혐오, 비하, 성희롱, 협박 등 명백한 악의가 있는 문장.
- 욕설 필터링을 우회한 변칙 표현(예: "ㅅ1ㅂ", "ㅂ@ㅅ", "개1새1끼" 등)이 명백한 경우.

───────────────────────────────────────────────────────
[2. 정상(클린) 판정 예외 규칙 (isMalicious: false) ★가장 중요★]
다음의 경우는 특수문자가 포함되어 있더라도 "절대 악플이 아니며 정상적인 표현"으로 판정해야 한다:
1) 감정 표현 이모티콘: "^^", "ㅠㅠ", "ㅜㅜ", "ㅎㅎ", "ㅋㅋ", "*^^*", "(^-^)", "@_@", ";;", "ㅇㅅㅇ" 등
2) 단순 문장부호 및 기호: "!", "?", "~", "...", "*", "#", "-", "/" 등
3) 긍정적 감탄 및 강조:
   - "와 대박 ㅠㅠ 너무 감동이에요!!" → 정상 (isMalicious: false, toxicityScore: 0)
   - "선생님 정말 감사합니다 ^^~" → 정상 (isMalicious: false, toxicityScore: 0)
   - "와 미쳤다 ㅋㅋㅋㅋ 진짜 잘하네!!" → 칭찬 감탄사이므로 정상 (isMalicious: false, toxicityScore: 5)
   - "이게 진짜 가능하다고?? 헐 대박" → 호기심/놀람이므로 정상 (isMalicious: false, toxicityScore: 0)
4) 단순 특수문자 나열: 아무런 악의적 텍스트 없이 "~!", "?!?", "^^;" 등만 있는 경우 정상으로 처리.

───────────────────────────────────────────────────────
[3. 응답 JSON 스키마]
{
  "isMalicious": boolean, // 악플이면 true, 정상/클린 문장이면 false
  "toxicityScore": number, // 0~100 사이의 악플 위험도 점수 (완전 정상은 0~10, 경미한 불쾌감은 20~40, 노골적 악플은 70~100)
  "reason": string, // 판별 사유 (1~2문장의 자연스러운 한국어)
  "tags": string[], // 감지된 성격 태그 1~3개 (예: ["#타인비하", "#비속어"] 또는 ["#따뜻한응원", "#배려", "#감사"])
  "suggestedCleanText": string // 악플인 경우 타인에게 상처 주지 않고 정중하게 순화한 대체 문장 (클린한 경우 원문 그대로 또는 칭찬 문장)
}

───────────────────────────────────────────────────────
[4. 순화 문장(suggestedCleanText) 작성 원칙]
- 원래 전달하려던 피드백의 취지는 살리되, 비난·조롱·욕설을 완전히 배제하고 상호 존중하는 정중하고 따뜻한 어조로 바꿀 것.`,
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
