---
name: simplify-trace
description: Summarize a large Chrome DevTools performance trace into a compact markdown report so it can be reasoned about without loading the whole file. Use when given a Chrome/DevTools/Performance-panel trace (a multi-MB `Trace-*.json` or `*.json` with `traceEvents`) and asked to find what is slow, what runs too often, long tasks, jank, or hot JS functions.
---

# Simplify trace

Chrome DevTools performance traces are tens to hundreds of MB of JSON — far too large to read directly. This skill turns one into a few-KB markdown report that surfaces the work taking too long or happening too often.

## Usage

Run the script on the trace file. It prints markdown to stdout (or `--out FILE`):

```bash
node skills/simplify-trace/scripts/simplify-trace.mjs <trace.json> [--top N] [--long-task-ms MS] [--window START-END] [--out report.md]
```

- `--top N` — rows per table (default 25).
- `--long-task-ms MS` — long-task threshold (default 50).
- `--window START-END` — scope the whole report to a time slice (offsets in ms from trace start).
- `--only a,b` / `--except a,b` / `--all` — pick which sections to emit.
- `--match TEXT` — case-insensitive filter for rows (event names, function names, URLs).
- `--list` — print the available section keys and exit.
- `--out FILE` — write to a file instead of stdout.
- Traces over ~500 MB: prefix `node --max-old-space-size=8192`.

Default to running with `--out` to a temp file for big traces, then read the report. Don't read the raw trace.

## Sections

Default sections: `summary`, `longtasks`, `events`, `frequent`, `functions`, `categories`. Opt-in: `timeline` (per-second main-thread busy time — use to locate activity), `network` (resource/fetch waterfall with TTFB/duration/size), `websocket` (WebSocket lifecycle — `/app/file` doc sync). Run `--list` for the full set. Interrogate narrowly, e.g.:

```bash
# where is the activity? then window to it
node …/simplify-trace.mjs trace.json --only timeline
# what was the network/socket doing during the action?
node …/simplify-trace.mjs trace.json --only network,websocket --window 62000-69000 --match tldraw
```

The trace's `metadata.startTime` (ISO/UTC) anchors offset 0 to wall-clock, so trace offsets can be lined up against server logs (zero-cache, sync-worker) by timestamp. For an idle, network-quiet gap, the trace shows *when* but not *why* — add `performance.mark()`/`console.timeStamp()` in the client path and they appear on the trace timeline.

## "What happens when I do X" traces

A recording of a single action (switch file, open menu) is mostly idle setup time, which dilutes the action across the whole trace. Window to the action instead:

1. Run once with no window. Note where activity is — the long tasks' offsets, or bucket main-thread busy-time per second with a quick inline script to find the active span.
2. Re-run with `--window START-END` around that span. All tables then describe only the action.

The recording artifact `CpuProfiler::StartProfiling` (the profiler turning on, ~50–60ms) is excluded from the long-task table, including when it's nested inside a `RunTask`. If long tasks shows "None", the action genuinely has no single blocking task — look at aggregate self time, GC, and animation-loop events instead.

## What the report contains

- **Header** — event count, wall-clock span, sampled JS CPU time, and idle %.
- **Long tasks** — top-level tasks over the threshold (main-thread jank), with the time offset where each occurred.
- **Hottest event types (self time)** — where engine/browser time actually goes (layout, GC, paint, function calls), excluding time spent in nested children.
- **Most frequent event types (count)** — work happening too often.
- **Hottest JS functions** — bottom-up self time from the embedded V8 CPU profile, with `file:line`. Synthetic `(idle)`/`(program)` frames are excluded here (idle is in the header).
- **Self time by category** — high-level breakdown across trace categories.

## How to read it

- A function high in **self time** is the actual cost; high **total** but low self means the cost is in its callees — follow the call tree.
- High **count** with low avg = death by a thousand cuts (often a reactive/render loop firing too often); investigate why it fires, not its per-call cost.
- Long tasks point at *when* jank happened; cross-reference the offset against what the user was doing.
- Minified names (`r`, `Tg`) come with a `file:line` — use it to locate the source.

The script only summarizes; it does not modify the trace.
