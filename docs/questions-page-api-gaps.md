# Questions page — API gaps

What the session-runner screen needs, what the practice API supports today, and the
additions that would close the difference. Nothing here is blocking: the runner
(`pages/QuestionsPage` + `use-question-session.ts`) ships against the API as it stands.
Each item is a capability the UI works around or does without.

## What already works

| Behaviour | Endpoint | Notes |
|---|---|---|
| Serve the next unanswered question | `GET /practice/question` | Returns position, total, prompt, choices, topic |
| Serve a specific position | `GET /practice/question?questionId=<position>` | `questionId` is a **1-based position**, not a `Question.id`. 400s once the position is no longer `ASSIGNED`, 404s if it doesn't exist |
| Answer + confidence + timing | `POST /practice/answer` | `selected_answer`, `time_spent_seconds`, and `confidence_level` — which accepts `confidence` as an alias (`AliasChoices`), so either field name works |
| Change an answer | `PUT /practice/attempts/{attempt_id}` | `attempt_id` comes back from `POST /answer`. **Currently unused by the runner** — see Gap 2 |
| Finish | `POST /practice/complete` | Score, `average_confidence`, `question_breakdown` |

**Skip is an answer.** `POST /practice/answer` with `selected_answer: null` records an
attempt with no choice and advances the session; the runner tracks "skipped" locally to
style the progress bar and jump grid. This is the only way to move past a question — the
slot is consumed either way, so a skipped question does not come back later in the
session. Do not add a separate skip endpoint without deciding first whether skipped
positions should stay servable.

## Gap 1 — a refreshed session cannot be reviewed (highest impact)

`GET /practice/question?questionId=<position>` raises **400 "Question has already been
answered"** once the position's status is not `ASSIGNED`
(`practice_service.get_current_question`).

The runner lets a student page backwards and reopen anything already answered. It can
only do that by **caching every question it has been served in component state** and
re-rendering from that cache.

Consequence: a page refresh mid-session loses the cache. The student can continue
forward, but everything already answered becomes unreachable and the jump grid shows
those positions as locked rather than as answered/skipped.

**Requested:** either let `?questionId=` serve answered positions (returning the stored
`selected_answer`, `confidence_level` and `attempt_id` alongside the question), or add a
session snapshot:

```
GET /api/v1/practice/session
{
  "status": "in_progress",
  "current_position": 4,
  "total_questions": 10,
  "elapsed_seconds": 512,
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
entirely. It also subsumes Gap 5.

## Gap 2 — review is read-only, and revising an answer would desync confidence

The runner treats reviewed questions as immutable and never calls
`PUT /practice/attempts/{attempt_id}` — `updateAttempt` exists in `practice-service.ts`
but has no caller.

Two things block turning review editable:

1. The `attempt_id` is only known for questions answered in the current tab (Gap 1), so
   editing would work before a refresh and silently stop working after one.
2. `UpdateAttemptRequest` accepts only `selected_answer`. A student who changes their
   answer keeps the confidence rating they gave the *original* answer, which corrupts the
   confidence-vs-accuracy signal behind `average_confidence` and any future calibration
   work.

**Requested:** accept an optional `confidence_level` (1–5) on
`PUT /practice/attempts/{attempt_id}`, validated as on `POST /answer`. Pair it with Gap 1
before the UI enables editing — either alone is not enough.

## Gap 3 — no per-answer correctness or explanation

Correctness and explanations appear only in the `POST /practice/complete` payload. This
matches the design, which deliberately does **not** reveal correctness mid-session —
noted here so it is not "fixed" by accident. If instant feedback is ever wanted,
`POST /answer` would need to return `is_correct` and `explanation`.

## Gap 4 — `time_spent_seconds` is not in the completion breakdown

`QuestionBreakdownItem` carries `confidence_level` but not `time_spent_seconds`, even
though the value is stored on `Attempt`. The results screen wants per-question timing and
currently reads it through a defensive local type that always resolves to `0`.

**Requested:** add `time_spent_seconds` to `QuestionBreakdownItem`. Self-contained — no
dependency on the other gaps.

## Gap 5 — session totals are client-side

The per-question timer and session total are both counted in the browser, so they reset
on refresh and drift while a tab is backgrounded. The per-question value is what gets
persisted via `POST /answer`, so stored data stays roughly right, but the displayed
session total is not authoritative.

**Requested (low priority):** return `elapsed_seconds` derived from the session's
`started_at`, on the Gap 1 snapshot.
