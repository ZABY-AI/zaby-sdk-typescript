# Zaby SDK — Final Bug Audit
## Only real code-level bugs that cause incorrect behavior

---

### DEFINITE BUGS (proven by test execution)

| # | Location | Bug | Evidence |
|---|----------|-----|----------|
| 1 | `src/config.ts:77-79` + `src/transport.ts:115-127` | **`retries: 3` never triggers** — number shorthand sets `{attempts:3}` but `sendWithRetry` defaults `retryMethods` and `retryStatuses` to `[]`. `shouldRetry` is always `false` | `qa-transport.test.ts:201`: callCount=1 despite retries:3 |
| 2 | `src/sse.ts:7-12` | **SSE buffers entire body before yielding** — `readStream()` reads the full stream into memory, then normalizes, splits, and parses. No event yields until ALL data is received | `qa-sse-stress.test.ts`: 200 events all arrive at once, not progressively |
| 3 | `src/testing/index.ts:20-31` | **MockTransport cursor advances before validation** — `this.responses[this.cursor++]` happens BEFORE the method/path check at line 29. A failed match permanently burns the response slot | `qa-mock-advanced.test.ts`: verified pattern |
| 4 | `src/testing/index.ts:23` | **MockTransport crashes on missing headers** — `normalizeHeaders(request.headers)` calls `Object.entries(undefined)` if caller omits headers | Confirmed: `TypeError: Cannot convert undefined or null to object` |
| 5 | `src/testing/index.ts:29` | **MockTransport path matching breaks with query params** — compares `response.path` (bare) to `request.path` (with `?query=...`). Always fails for endpoints with query params | `qa-mock-advanced.test.ts`: throws "Expected GET /items, received GET /items?limit=10" |
| 6 | `src/sse.ts:51-52` | **`parseData("")` returns `null` instead of `""`** — SSE spec: `data:\n\n` should yield `data: ""` (valid message with empty string). Instead yields `data: null` | `qa-sse.test.ts`: confirmed |
| 7 | `src/transport.ts:163-169` | **`parseJsonBody` silently swallows JSON errors** — `catch { return undefined; }` discards parse errors. If server sends malformed JSON with 200 status, caller sees `undefined` with no warning | Static analysis; test `parseJsonBody returns undefined for invalid JSON` confirms silent swallow |
| 8 | `src/sse.ts:37-48` | **`reader.releaseLock()` never called** — no `try/finally` around the read loop. If `reader.read()` throws, the reader is leaked until GC | Static analysis |
| 9 | `src/zaby.ts:89-91` | **`HealthClient.check()` ignores all options** — takes `()` not `(options?)`. `requestId`, `signal`, and any other args are silently discarded. Can't abort or trace health checks | `qa-integration.test.ts`: `x-request-id` remains undefined even when passed |

---

### EDGE-CASE BUGS (real but rarely hit)

| # | Location | Bug | Impact |
|---|----------|-----|--------|
| 10 | `src/transport.ts:48-59` | **Stream error responses lose error details** — `request.stream` path returns `{bodyStream}` without `json`. If server responds with 4xx/5xx + stream, `createErrorFromResponse` reads `response.json` which is `undefined`, so `body = {}`. Error details are empty | Only matters if server returns error with stream |
| 11 | `src/sse.ts:7` | **SSE holds 3x body in memory** — source string + normalized (`.replace`) + split array. For large streaming responses (agent conversations), this is wasteful | Performance, not correctness |
| 12 | `src/transport.ts:36-61` | **No timeout on stream body reading** — timeout covers only the HTTP fetch call (headers received). Reading the body stream has no timeout | Stuck stream = stuck forever |

---

### CODE QUALITY (not incorrect behavior)

| # | Location | Issue |
|---|----------|-------|
| 13 | `src/transport.ts:82-84` | Dead code: `request()` checks `status >= 400` but `raw()` already throws for that |
| 14 | `src/errors/index.ts:77-88` | No status-0 mapping to `ZabyStreamError` (network errors get generic error) |
| 15 | `src/util.ts:3-8` | `joinPath` exported but never imported anywhere (dead code) |
| 16 | `src/transport.ts:100-104` | ~10 client methods use `query as any` cast, letting objects silently become `[object Object]` in URLs |

---

### FALSE POSITIVES (my earlier claims were wrong)

| # | Claim | Reality |
|---|-------|---------|
| BUG-001 (original) | "retries: 3 does nothing" | **Config layer works fine** — `normalizeRetryPolicy(3)` returns `{attempts:3}`. Bug is in transport: empty `retryMethods`/`retryStatuses` prevent triggering |
| BUG-008 (original) | "2x memory" | Actually 3x (source + normalized + split) — worse than stated |
| BUG-009 | "12+ methods affected" | Actually ~10 methods use `query as any` — slightly fewer |
| BUG-010 | "requestId serialized into JSON body" | **Not a bug.** `requestId` is a legitimate field of `CoreRequestOptions` and is handled as header, not JSON body |
| BUG-013 | "retryAfter not on class" | **False positive** — inherited from `ZabyApiError`, works correctly |
| BUG-015 | "empty iterable masks errors" | **Not a bug.** Empty input correctly yields no events |
| BUG-018 | "ESLint --ext broken" | **False positive** — ESLint 9.39.4 accepts `--ext` |
| BUG-INT-005/006/007/008/009 | Missing methods like `list()`, `query()`, `submit()` | **Not bugs** — these are the actual API design. The methods have different names |
| BUG-NEW-003 | env var assertions | **Examples only**, not core SDK |

---

## Verdict: 12 real bugs in SDK code (8 definite, 4 edge-case)

The most impactful:
- **Retry system is broken** — number shorthand never triggers
- **SSE streaming defeats its purpose** — full buffering prevents progressive rendering
- **MockTransport is unreliable for testing** — cursor corruption + query param breakage + missing headers crash
- **Health checks can't be aborted or traced**
- **Empty data values silently become null** (SSE spec violation)
