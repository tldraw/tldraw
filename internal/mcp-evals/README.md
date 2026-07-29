# mcp-evals

Eval harness for the tldraw.com board MCP server (`POST /api/app/mcp`, implemented in
`apps/dotcom/sync-worker/src/routes/tla/sharedBoardScreenshotMcp.ts`).

It runs a set of tasks against a set of boards, repeats each one, and reports whether the
task was completed, how many tokens it cost, how long it took, and how many tool calls it
took — for any agent you plug in.

## What it is actually measuring

The server exposes two read-only tools: `get_board_info` lists a board's pages, and
`get_shared_board_screenshot` returns a 1200x630 PNG of one page. There is no shape data,
no text extraction, no structure. So every task here is a **vision** task: the agent looks
at screenshots and answers.

Four task types — the three things agents need to do with a board, plus `open` for
prompts you have not written ground truth for yet:

| Type        | Question                                              | Graded by                                                         |
| ----------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| `open`      | Anything                                              | **Not graded.** Cost, latency, and tool count are still measured. |
| `describe`  | "What is on this board?"                              | LLM judge on a binary rubric **plus** deterministic entity recall |
| `locate`    | "Where exactly is X?"                                 | Arithmetic against a ground-truth box. No judge.                  |
| `find-many` | "Find all X" / "What differs between these sections?" | Set precision/recall/F1 with partial credit                       |

Every task requires the agent to end with an `<answer>` block containing JSON in a fixed
shape. That envelope is what turns `locate` and `find-many` into arithmetic instead of
judgement — it is the main reason this harness is cheap to run and stable across judge
model upgrades. `describe` is the only type that puts a model in the scoring loop, and even
there the entity-recall half is deterministic, so judge drift can move a score but cannot
invent or destroy a pass on its own.

`open` exists so a two-column CSV is immediately useful. Those rows run, and their cost and
latency are reported like any other — but they carry no verdict, so they are recorded as
`ungraded` and kept out of every pass-rate denominator. The harness will not tell you a
prompt passed when nothing was checked.

## Setup

Put your key in `internal/mcp-evals/.env` (gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...
```

The runner loads that file automatically. A key already exported in the environment
wins over the file, so CI can inject one without anyone deleting their local `.env`.

A `.env` is preferred over `export` because an exported variable does not survive between
terminals or tools that spawn their own shell — and the run would then fail its preflight
check after you had already waited through the paced screenshot calls.

## Running

```bash
yarn dry-run                      # resolve every board fixture, no model calls, no cost
yarn eval                         # full suite, 3 runs per task
yarn eval --suite my-prompts.csv  # any CSV
yarn eval --tasks row-2,row-5     # specific rows
yarn eval --runs 1 --effort low   # quick iteration
yarn eval --no-cache              # real end-to-end latency (see below)
```

Useful flags: `--suite <path>`, `--model`, `--effort`, `--judge-model`, `--runs`,
`--max-tool-calls`, `--timeout <seconds>`, `--endpoint`, `--out <dir>`.

Output lands in `runs/<timestamp>/`:

| Path            | What's in it                                                  |
| --------------- | ------------------------------------------------------------- |
| `report.md`     | The summary table.                                            |
| `results.jsonl` | One row per attempt, for later analysis.                      |
| `transcripts/`  | Full message history per attempt.                             |
| `images/`       | **The screenshots the agent actually saw**, as viewable PNGs. |

`report.md` ends with an **Answers for review** section carrying the full text of every
attempt that did not auto-pass, alongside its tool calls, token count, and screenshots. That
is the whole workflow before ground truth exists: run the prompts, read the answers, write
ground truth from what you learn. Expectations written _before_ you have seen how agents
actually respond tend to encode the wrong thing. Passing attempts are omitted — they need no
eyes, and including them would bury the ones that do.

In a vision eval the image _is_ the input, so `images/` is usually the first place to look
when a score moves — it answers "was the screenshot any good?" without decoding base64.
Extracting them also keeps transcripts readable: a single 1200x630 PNG is ~170KB of base64,
which is enough to make the surrounding JSON unopenable, so the transcript carries a pointer
to the file instead.

## Rate limits shape everything

The server allows roughly **two screenshot calls and two board-info calls per minute per
IP**, plus a per-board cap on cache misses. It reports a breach as a _successful_ tool
result with `isError: true` and text beginning "Rate limited" — so an agent left to see it
will burn a turn retrying or answer from nothing, and you end up measuring the limiter
instead of the agent.

`McpClient` therefore paces calls (~31s between screenshots), transparently absorbs and
retries any rate-limit response that still gets through, and records how many times it had
to. Those retries appear in the report as `rl-retries` so a slow run reads as throttling
rather than agent latency.

Consequence: **a task that takes 3 screenshots takes at least 90 seconds.** Attempts run
strictly in series, because the limits are per-IP and parallelism would only make the
throttling worse.

To make that survivable, screenshot results are cached to `.cache/` on disk and reused
across repeats. This is on by default. Cached calls are flagged, excluded from the MCP
latency figure, and the report carries a warning banner — so cached timings are never
silently mistaken for real ones. Use `--no-cache` when you actually want to measure
latency.

## The input CSV

Suites live in `suites/`. `default.csv` is committed and uses placeholder slugs to document
the format; **`suites/local.csv` is gitignored and takes precedence when it exists**, so put
your real boards there and `yarn eval` picks them up with no extra flag. This repo is
public, and a `/f/` share link grants access to whoever holds it — keep real board URLs out
of committed files. `suites/*.local.csv` is ignored too, for keeping several suites around.

Only two columns are required:

```csv
prompt,board_url
"Describe what is on this board.",https://www.tldraw.com/p/abc123
"Find the login mockup and say exactly where it is.",https://www.tldraw.com/p/abc123
```

That runs. Every column beyond those two is optional, and each one buys you more grading —
so you can start measuring cost and latency today and add ground truth as you build it,
without ever changing file format.

| Column                                                                                      | Purpose                                                                        |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `prompt`                                                                                    | **Required.** The instruction given to the agent.                              |
| `board_url`                                                                                 | **Required.** Full URL or bare slug. `url` and `board` are accepted spellings. |
| `id`                                                                                        | Task id used in reports. Defaults to `row-<n>`, matching the spreadsheet row.  |
| `type`                                                                                      | Force a type. Normally inferred from which expectation columns you filled in.  |
| `page`, `box`                                                                               | `locate` ground truth. `box` is `x0,y0,x1,y1`, normalized 0–1.                 |
| `items`                                                                                     | `find-many` ground truth. `\|` between items, `;` between aliases of one item. |
| `must_mention`                                                                              | `describe` entity recall. Same `\|` / `;` convention.                          |
| `rubric`                                                                                    | `describe` judge criteria, `\|` separated. Requires `reference`.               |
| `reference`                                                                                 | The known-good description the judge scores against.                           |
| `min_f1`, `min_recall`, `min_iou`, `max_tool_calls`, `board_name`, `approx_shapes`, `notes` | Per-row overrides.                                                             |

**Type is inferred from what you filled in** — `box` means `locate`, `items` means
`find-many`, `rubric`/`must_mention` means `describe`, and nothing means `open`. Setting
`type` explicitly and then omitting its ground truth is an error rather than a silent
downgrade to `open`, so a half-finished row fails loudly instead of quietly reporting as
ungraded forever.

Board URLs are normalized for you: `/p/` and `/f/` links both work, with or without a
scheme, and viewport query params and fragments are stripped. A `/r/` room URL is rejected
by name, because the server only serves published and link-shared boards and would
otherwise fail later with a vague "no public board found".

Prompts are prose, so the file is parsed as real RFC 4180 CSV — commas, quotes, and
newlines inside a quoted cell all survive, and a spreadsheet export with a BOM and CRLF
line endings loads fine.

`.json` suites still load if you prefer to keep richer ground truth outside a spreadsheet;
the loader picks the format by extension.

## Authoring ground truth

1. **Check the boards resolve.** `yarn dry-run` resolves every board in the CSV and prints
   its pages, with no model calls and no cost. Private, unshared, and deleted files are
   refused by design — this is where you find that out.

2. **Get the screenshots.** `yarn fixtures` writes every page of every board in the suite to
   `fixtures/` as PNGs. `yarn fixtures --board <url>` does a single board. You need these to
   author `locate` boxes.

3. **`locate` boxes.** Open the PNG, read the target's bounding box in pixels, and normalize
   against the 1200x630 screenshot: `x0/1200, y0/630, x1/1200, y1/630`. By default the agent
   passes if the center of its predicted box falls inside yours, which is what "find where X
   is" means; set `min_iou` if you want to grade box tightness too. Pasting raw pixel
   coordinates is rejected at load time rather than silently never matching.

4. **`find-many` items.** Each item is a set of accepted phrasings. Matching is greedy and
   one-to-one, so a single vague answer cannot collect credit for several findings.

5. **`describe` rubrics.** Write the `reference` yourself after looking at the board. Keep
   criteria **binary** — "identifies what kind of board this is", not "describes the board
   well". Binary criteria survive judge model upgrades; a 1–10 quality score does not,
   because its midpoint drifts and quietly reshapes every historical comparison.

Cover a size ladder — a small board, a medium one, and one large enough to strain a single
1200x630 screenshot. Context blowup and detail loss on big boards is where these evals will
earn their keep.

## Reading the report

- **Pass rate is `k/n`, never a mean.** `2/3` and `3/3` are different stories and averaging
  hides which one you have.
- **Cost and latency are medians with a min–max spread.** One runaway attempt drags a mean
  somewhere no individual run ever was. Tasks whose slowest run exceeds 2x the fastest are
  flagged `unstable` — treat those numbers as noise, not signal.
- **Latency is split into agent time and MCP time**, so a slow server doesn't read as a dumb
  agent.
- **Failures are classified, not collapsed:**

  | Outcome            | Meaning                                                                               |
  | ------------------ | ------------------------------------------------------------------------------------- |
  | `pass`             | Graded complete                                                                       |
  | `wrong_answer`     | Well-formed answer, graded incorrect                                                  |
  | `malformed_answer` | No parseable `<answer>` block — usually a prompt or adapter bug, not a capability one |
  | `budget_exceeded`  | Hit the tool-call ceiling                                                             |
  | `timeout`          | Hit the attempt wall-clock ceiling                                                    |
  | `infra_error`      | Transport or API failure — retried, and **excluded from the denominator**             |
  | `ungraded`         | Ran and was measured, but the row had no ground truth — also excluded                 |

  Without the last two distinctions, one flaky afternoon — or a CSV of prompts you have not
  written ground truth for yet — reads as a total quality collapse.

## Adding an agent

Implement `EvalAgent` (`src/types.ts`) — one `run()` method — and register it in `run.ts`.
The adapter owns the model loop; the harness owns fixtures, prompts, pacing, grading, and
metrics. Prompts are byte-identical across agents so a score difference is a difference
between agents rather than between the harnesses around them, and tool calls are counted
from the MCP client's own log rather than from anything the adapter reports about itself.

`src/agents/claude.ts` is the reference adapter (Anthropic Messages API).
