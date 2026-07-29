/**
 * Shared types for the tldraw.com board MCP eval harness.
 *
 * The harness measures four things per attempt: whether the task was completed,
 * how many tokens it cost, how long it took, and how many tool calls it took.
 * Everything here exists to make those four numbers comparable across agents.
 */

export type TaskType = 'describe' | 'locate' | 'find-many' | 'open'

/** A normalized box in screenshot space: [x0, y0, x1, y1], each 0–1. */
export type NormalizedBox = [number, number, number, number]

interface TaskBase {
	id: string
	/** Board fixture id — the key in suites/boards.json, not the raw tldraw.com slug. */
	board: string
	/** The instruction handed to the agent, minus the answer-envelope boilerplate. */
	prompt: string
	/** Optional per-task override of the agent's tool-call budget. */
	maxToolCalls?: number
}

/**
 * "Describe what is on a board." The only task type that needs a judge, because
 * there is no single right answer — so it also carries a deterministic recall
 * check that does not depend on judge calibration.
 */
export interface DescribeTask extends TaskBase {
	type: 'describe'
	/** A known-good description the judge scores against. */
	reference: string
	/** Binary criteria. Judges score each true/false; scoring 1–10 is not stable across judge versions. */
	rubric: string[]
	/**
	 * Each entry is one required entity, expressed as a list of accepted spellings.
	 * Graded deterministically against the answer text — no judge involved.
	 */
	mustMention: string[][]
	/** Fraction of `mustMention` groups that must appear. Defaults to 0.8. */
	minRecall?: number
}

/**
 * "Find exactly where something is." The backbone task type: graded with zero
 * judge involvement, so it fails loudly and cheaply when shape addressing or
 * spatial reasoning regresses.
 */
export interface LocateTask extends TaskBase {
	type: 'locate'
	expect: {
		/** 0-based page index the thing lives on. */
		page: number
		/** Ground-truth box in normalized screenshot space. */
		box: NormalizedBox
	}
	/**
	 * When set, the predicted box must reach this IoU with the truth box.
	 * When unset, the looser default applies: the predicted box's center must
	 * fall inside the truth box, which is what "find where X is" actually means.
	 */
	minIou?: number
}

/**
 * "Find multiple things, or differences between sections." Graded as a set with
 * partial credit — "found 7 of 9" is the signal, and a pass/fail threshold alone
 * throws that away.
 */
export interface FindManyTask extends TaskBase {
	type: 'find-many'
	expect: {
		items: {
			/** Stable id used in the report so a partially-correct answer is diffable. */
			id: string
			/** Lowercase substrings; an answer item matches if it contains any of them. */
			match: string[]
		}[]
	}
	/** F1 the answer must reach to count as complete. Defaults to 0.7. */
	minF1?: number
}

/**
 * A prompt with no ground truth attached yet.
 *
 * This is what a two-column CSV gives you, and it is deliberately honest about
 * what it buys: the attempt runs and its cost, latency, and tool-call count are
 * all measured, but completion is *not* judged — the outcome is `ungraded` and it
 * stays out of every pass-rate denominator. Add expectation columns to the row to
 * promote it to a graded type.
 */
export interface OpenTask extends TaskBase {
	type: 'open'
}

export type Task = DescribeTask | LocateTask | FindManyTask | OpenTask

export interface BoardFixture {
	/** The `:slug` from tldraw.com/p/:slug or tldraw.com/f/:slug. */
	boardId: string
	/** Human-readable label for reports. */
	name: string
	/** Rough shape count, so reports can correlate failures with board size. */
	approxShapes?: number
	notes?: string
}

export interface Suite {
	boards: Record<string, BoardFixture>
	tasks: Task[]
}

/**
 * Every way an attempt can end. Collapsing these into "fail" is how a flaky
 * afternoon gets read as a quality regression, so they stay distinct all the way
 * into the report.
 */
export type Outcome =
	| 'pass'
	| 'wrong_answer'
	| 'malformed_answer'
	| 'budget_exceeded'
	| 'timeout'
	| 'infra_error'
	/** Ran fine and was measured, but had no ground truth to be judged against. */
	| 'ungraded'

/** `infra_error` attempts are retried and excluded from the denominator. */
export function isInfraFailure(outcome: Outcome) {
	return outcome === 'infra_error'
}

/**
 * Outcomes that carry no verdict about quality. Both are excluded from pass-rate
 * denominators — reporting "0/3 passed" for rows that were never gradeable would
 * read as a total failure when nothing was actually tested.
 */
export function isUnscored(outcome: Outcome) {
	return outcome === 'infra_error' || outcome === 'ungraded'
}

export interface TokenUsage {
	inputTokens: number
	outputTokens: number
	cacheReadTokens: number
	cacheCreationTokens: number
}

export interface ToolCallRecord {
	name: string
	args: unknown
	/** Round-trip time for the call the agent actually saw. */
	durationMs: number
	ok: boolean
	/** Rate-limit responses the harness absorbed and retried behind the agent's back. */
	rateLimitRetries: number
	/** True when the harness answered from its on-disk screenshot cache. */
	fromLocalCache: boolean
}

export interface AgentResult {
	/** Parsed contents of the agent's <answer> block, or null if it was absent or not JSON. */
	answer: unknown
	/**
	 * The raw text inside the <answer> block, before JSON parsing. Lets an `open`
	 * task accept a prose answer, which has nothing to grade and so gains nothing
	 * from a strict schema.
	 */
	answerBlock: string | null
	rawFinalText: string
	usage: TokenUsage
	/** Wall time spent inside the agent's own model calls. */
	agentMs: number
	transcript: unknown[]
	/** Set when the agent stopped for a reason other than finishing. */
	stoppedBecause?: 'budget_exceeded' | 'timeout'
}

export interface Grade {
	/** 0–1. Binary for `locate`, partial credit for `find-many` and `describe`. */
	score: number
	pass: boolean
	/** Short human-readable reason, shown in the report for failures. */
	detail: string
	/** Structured breakdown, kept in the JSONL for later analysis. */
	breakdown?: Record<string, unknown>
}

export interface Attempt {
	taskId: string
	taskType: TaskType
	board: string
	agent: string
	/** 1-based repeat index. */
	run: number
	outcome: Outcome
	score: number
	detail: string
	breakdown?: Record<string, unknown>
	usage: TokenUsage
	toolCalls: number
	/** Rate-limit retries the agent never saw, summed across calls. */
	rateLimitRetries: number
	wallMs: number
	agentMs: number
	/** Wall time spent in MCP calls, excluding locally-cached ones. */
	mcpMs: number
	/** True if any MCP call was served from the local cache — timings are not real. */
	usedLocalCache: boolean
	transcriptPath: string
	/**
	 * The agent's answer, rendered for reading. Carried on the attempt itself so a
	 * run can be reviewed by eye without opening transcripts — which is the whole
	 * workflow before ground truth exists.
	 */
	answerText?: string
	/** Tool calls in order, so a review can see how the answer was arrived at. */
	calls?: { name: string; args: unknown }[]
	/** PNGs of the screenshots this attempt saw, relative to the run's images/ dir. */
	images?: string[]
	error?: string
}

export interface EvalAgent {
	name: string
	/**
	 * Run one attempt. The adapter owns the model loop; the harness owns fixtures,
	 * grading, metrics, and the MCP transport it is handed.
	 */
	run(input: {
		task: Task
		board: BoardFixture
		systemPrompt: string
		userPrompt: string
		mcp: import('./mcp-client.js').McpClient
		maxToolCalls: number
		signal: AbortSignal
	}): Promise<AgentResult>
}

export function emptyUsage(): TokenUsage {
	return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 }
}

export function addUsage(into: TokenUsage, from: Partial<TokenUsage>) {
	into.inputTokens += from.inputTokens ?? 0
	into.outputTokens += from.outputTokens ?? 0
	into.cacheReadTokens += from.cacheReadTokens ?? 0
	into.cacheCreationTokens += from.cacheCreationTokens ?? 0
}
