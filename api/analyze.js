// =====================================================
// /api/analyze.js - AI 악플 판별 서버리스 함수
// 역할: 사용자가 보낸 댓글을 받아 OpenAI API에 물어본 뒤,
//       악플인지 아닌지를 JSON으로 프론트엔드에 돌려줍니다.
// =====================================================

import OpenAI from "openai";

export default async function handler(req, res) {
  // POST 요청만 허용합니다. 다른 방식(GET 등)은 405 에러를 반환합니다.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  // 요청 본문(body)에서 댓글 내용을 꺼냅니다.
  const { comment } = req.body;

  // 댓글이 비어있으면 API를 호출하지 않고 바로 에러 메시지를 반환합니다.
  if (!comment || comment.trim() === "") {
    return res.status(400).json({ error: "댓글 내용을 입력해주세요." });
  }

  try {
    // Vercel 환경변수에서 OpenAI API 키를 가져옵니다.
    // 이 코드는 서버(Node.js)에서만 실행되므로 키가 외부에 절대 노출되지 않습니다.
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // OpenAI gpt-4o-mini 모델에게 악플 판별을 요청합니다.
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      // response_format을 json_object로 설정하면 AI가 반드시 JSON 형식으로 답변합니다.
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          // AI에게 역할을 부여하는 시스템 프롬프트입니다.
          content:
            "너는 한국어 댓글의 악성 여부(욕설, 비하, 혐오, 인신공격, 성희롱 등)를 판별하는 AI다. 입력된 댓글을 분석하여 반드시 JSON 형식으로만 응답하라. 악플이면 isMalicious를 true, 아니면 false로 설정하고 reason에 짧은 한국어 이유를 적어라. 예시: {\"isMalicious\": false, \"reason\": \"비방이나 욕설이 없는 일반적인 문장입니다.\"}",
        },
        {
          role: "user",
          // 사용자가 입력한 댓글을 AI에게 전달합니다.
          content: `다음 댓글을 판별해줘: "${comment}"`,
        },
      ],
    });

    // AI가 답변한 JSON 문자열을 JavaScript 객체로 변환합니다.
    const result = JSON.parse(completion.choices[0].message.content);

    // 프론트엔드에 결과를 반환합니다. { isMalicious: boolean, reason: string }
    return res.status(200).json(result);
  } catch (error) {
    // 예상치 못한 에러 발생 시 에러 메시지를 반환합니다.
    console.error("OpenAI API 호출 에러:", error);
    return res.status(500).json({ error: "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
  }
}
