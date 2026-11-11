// =====================================================
// /api/feedback.js - 피드백 조회 & 저장 서버리스 함수
// 역할: GET 요청 시 Supabase에서 피드백 목록을 가져오고,
//       POST 요청 시 새 피드백을 Supabase에 저장합니다.
// =====================================================

import { createClient } from "@supabase/supabase-js";

// Vercel 환경변수에서 Supabase 접속 정보를 가져옵니다.
// 이 역시 서버에서만 실행되므로 키가 외부에 절대 노출되지 않습니다.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // ── GET /api/feedback : 피드백 목록 조회 ──────────────
  if (req.method === "GET") {
    try {
      // feedbacks 테이블에서 모든 행을 최신순(created_at 내림차순)으로 가져옵니다.
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .order("created_at", { ascending: false });

      // Supabase 에러가 있으면 500 에러를 반환합니다.
      if (error) throw error;

      // 성공: 피드백 목록을 { feedbacks: [...] } 형태로 반환합니다.
      return res.status(200).json({ feedbacks: data });
    } catch (error) {
      console.error("피드백 조회 에러:", error);
      return res.status(500).json({ error: "피드백 목록을 불러오는 중 오류가 발생했습니다." });
    }
  }

  // ── POST /api/feedback : 피드백 저장 ──────────────────
  if (req.method === "POST") {
    // 요청 본문에서 닉네임과 피드백 내용을 꺼냅니다.
    const { nickname, content } = req.body;

    // 피드백 내용은 필수입니다. 비어있으면 에러를 반환합니다.
    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "피드백 내용을 입력해주세요." });
    }

    try {
      // feedbacks 테이블에 새 행을 삽입합니다.
      // 닉네임이 비어있으면 '익명'으로 저장합니다.
      const { data, error } = await supabase
        .from("feedbacks")
        .insert([
          {
            nickname: nickname?.trim() || "익명",
            content: content.trim(),
          },
        ])
        .select() // 삽입된 행 데이터를 반환하도록 요청합니다.
        .single(); // 단일 객체로 받습니다.

      // Supabase 에러가 있으면 500 에러를 반환합니다.
      if (error) throw error;

      // 성공: 등록 완료 메시지와 저장된 데이터를 반환합니다.
      return res.status(201).json({
        message: "피드백이 성공적으로 등록되었습니다.",
        data: data,
      });
    } catch (error) {
      console.error("피드백 저장 에러:", error);
      return res.status(500).json({ error: "피드백 저장 중 오류가 발생했습니다." });
    }
  }

  // GET/POST 외의 메서드는 허용하지 않습니다.
  return res.status(405).json({ error: "허용되지 않는 요청 방식입니다." });
}
