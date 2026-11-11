# 05. 백엔드 API 명세서 (Node.js / Vercel)

프론트엔드와 백엔드 간의 데이터 통신 규격을 정의합니다.

---

## 1. `POST /api/analyze` (악플 판별)
- **설명**: 사용자가 입력한 댓글을 받아 OpenAI API로 악플 여부를 판별합니다.
- **Request Body (JSON)**:
  ```json
  {
    "comment": "여기에 사용자가 입력한 댓글이 들어갑니다."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "isMalicious": false,
    "reason": "비방이나 욕설이 포함되지 않은 일반적인 문장입니다."
  }
  ```
- **Error Response (400 / 500)**:
  ```json
  {
    "error": "댓글 내용을 입력해주세요."
  }
  ```

---

## 2. `GET /api/feedback` (피드백 목록 조회)
- **설명**: Supabase `feedbacks` 테이블에서 모든 피드백을 최신순(`created_at DESC`)으로 조회합니다.
- **Response (200 OK)**:
  ```json
  {
    "feedbacks": [
      {
        "id": 2,
        "nickname": "태훈",
        "content": "강아지가 너무 귀여워요!",
        "created_at": "2026-11-11T03:30:00.000Z"
      },
      {
        "id": 1,
        "nickname": "익명",
        "content": "유용한 서비스네요.",
        "created_at": "2026-11-11T03:25:00.000Z"
      }
    ]
  }
  ```

---

## 3. `POST /api/feedback` (피드백 저장)
- **설명**: 새로운 피드백을 Supabase `feedbacks` 테이블에 저장합니다.
- **Request Body (JSON)**:
  ```json
  {
    "nickname": "익명",
    "content": "피드백 내용입니다."
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "피드백이 성공적으로 등록되었습니다.",
    "data": {
      "id": 3,
      "nickname": "익명",
      "content": "피드백 내용입니다.",
      "created_at": "2026-11-11T03:35:00.000Z"
    }
  }
  ```
