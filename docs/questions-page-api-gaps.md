# Questions page — API gaps

What the session-runner mockup asks for, what the current API supports, and the
additions needed to close the difference. Written for whoever picks up the backend
work; the frontend on `feature/questions-session-runner` ships against the API as it
is today, so nothing here is blocking — each item is a capability the UI currently
works around or does without.

## What already works

| Mockup behaviour | Endpoint | Notes |
|---|---|---|
| Serve the current question | `GET /practice/question` | Returns position, total, prompt, choices, topic |
| Serve a specific position | `GET /practice/question?questionId=<position>` | `questionId` is a **1-based position**, not a `Question.id` |
| Answer + confidence + timing | `POST /practice/answer` | Takes `selected_answer`, `time_spent_seconds`, `confidence_level` |
| Change an answer | `PUT /practice/attempts/{attempt_id}` | `attempt_id` comes back from `POST /answer` |
| Finish | `POST /practice/complete` | Score, `average_confidence`, `question_breakdown` |

Skipping needs no endpoint: the runner simply moves on without calling `/answer`, which
leaves the position `ASSIGNED` and therefore still servable. That is the only reason
"Skip — I'll come back" works at all, so please keep unanswered positions servable.

## Gap 1 — an answered question cannot be re-fetched (highest impact)

`GET /practice/question?questionId=<position>` raises **400 "Question has already been
answered"** when the position's status is not `ASSIGNED`
(`practice_service.get_current_question`).

The mockup lets a student page backwards through the session and revisit anything they
have already answered. Today the frontend can only do that by **caching every question
it has been served in component state** and re-rendering from that cache.

Consequences:
- A page refresh mid-session loses the cache. The student can continue forward but can
  no longer open anything they already answered, and the jump grid cannot show their
  previous answers.
- The `attempt_id` needed by `PUT /practice/attempts/{id}` is only known for questions
  answered in this browser session, so after a refresh answers can no longer be changed.

**Requested:** either allow `?questionId=` to serve answered positions (returning the
stored `selected_answer`, `confidence_level` and `attempt_id` alongside the question), or
add a session snapshot endpoint:

```
GET /api/v1/practice/session
{
  "status": "in_progress",
  "current_position": 4,
  "total_questions": 10,
  "questions": [
    { "position": 1, "status": "answered",
      "question": { "question_id": 12, "prompt": "…", "choices": {...},
                    "section": "math", "topic_display_name": "Algebra" },
      "attempt_id": 55, "selected_answer": "B", "confidence_level": 4,
      "time_spent_seconds": 42 },
    { "position": 2, "status": "assigned", "question": {...},
      "attempt_id": null, "selected_answer": null, "confidence_level": null,
      "time_spent_seconds": 0 }
  ]
}
```

The snapshot is the more useful of the two: it makes the jump grid accurate on first
paint and makes a refreshed session fully resumable, replacing the client-side cache
entirely.

## Gap 2 — confidence cannot be revised

`UpdateAttemptRequest` accepts only `selected_answer`. When a student revisits a question
and changes their answer, their original confidence rating stays attached to the new
answer, which quietly corrupts the confidence-vs-accuracy signal that
`average_confidence` and any future calibration analysis depend on.

**Requested:** accept an optional `confidence_level` (1–5) on
`PUT /practice/attempts/{attempt_id}`, validated the same way as on `POST /answer`. The
UI currently disables the confidence selector while reviewing, because offering a control
that silently fails to save would be worse than not offering it.

## Gap 3 — no per-answer correctness or explanation

Correctness and explanations only appear in the `POST /practice/complete` payload. This
matches the mockup, which does **not** reveal correctness mid-session — noted here only
so it is not "fixed" by accident. If instant feedback is ever wanted, `POST /answer`
would need to return `is_correct` and `explanation`.

## Gap 4 — `time_spent_seconds` is not in the completion breakdown

`question_breakdown[]` carries `confidence_level` but not `time_spent_seconds`, even
though the value is stored on `Attempt`. The results screen wants per-question timing and
currently reads it through a defensive local type that always resolves to `0`.

**Requested:** add `time_spent_seconds` to `QuestionBreakdownItem`.

## Gap 5 — session totals are client-side

The mockup shows a per-question timer and a session total. Both are counted in the
browser, so they reset on refresh and drift if a tab is backgrounded. The per-question
value is what gets persisted via `POST /answer`, so stored data stays roughly right, but
the displayed session total is not authoritative.

**Requested (low priority):** return `elapsed_seconds` on the session snapshot from
Gap 1, derived from the session's `started_at`.
