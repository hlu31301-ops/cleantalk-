// =====================================================
// /api/analyze.js - AI 악플 판별 & 순화 서버리스 함수
// 역할: 사용자가 보낸 댓글을 OpenAI API에 전달하여
//       1. 악플 여부(isMalicious)
//       2. 악플 위험도 점수(toxicityScore, 0~100)
//       3. 분석 사유(reason)
//       4. 감지 태그 목록(tags)
//       5. 따뜻한 순화 추천 문장(suggestedCleanText)
//       을 JSON으로 응답합니다.
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

    // OpenAI gpt-4o-mini 모델에게 악플 판별 및 예쁜 말 순화 요청
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `너는 한국어 댓글의 악성 여부를 분석하고 바른 언어 문화를 돕는 친절한 AI 전문가이다.
입력된 댓글을 정밀 분석하여 반드시 아래 JSON 형식으로만 응답하라.

응답 JSON 스키마:
{
  "isMalicious": boolean, // 악플(욕설, 비하, 조롱, 인신공격, 혐오 등)이면 true, 정상이면 false
  "toxicityScore": number, // 0부터 100 사이의 악플 위험도 점수 (완전 클린하면 0~15, 경미하면 30~50, 심각하면 70~100)
  "reason": string, // 짧고 명확한 한글 판별 이유 (1~2문장)
  "tags": string[], // 감지된 성격 태그 1~3개 (예: ["#타인비하", "#모욕"] 또는 ["#따뜻한응원", "#배려"])
  "suggestedCleanText": string // 악플인 경우 타인에게 상처 주지 않고 따뜻하고 정중하게 순화한 대체 문장 (클린한 경우 원문 그대로 또는 칭찬 문장)
}

순화 문장(suggestedCleanText) 작성 원칙:
- 원래 전달하려던 피드백의 핵심 뜻은 살리되, 비난/조롱/욕설을 완전히 배제하고 상호 존중하는 정중하고 따뜻한 구어체로 바꿀 것.`,
        },
        {
          role: "user",
          content: `다음 댓글을 분석하고 순화해줘: "${comment}"`,
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
