import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClaudeAgent } from './agents/claude.js'
import { gradeDescribe, gradeFindMany, gradeLocate } from './grade.js'
import { createClaudeJudge } from './judge.js'
import { McpClient, describeError } from './mcp-client.js'
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts.js'
import { renderMarkdown, summarize } from './report.js'
import { loadSuite } from './suite-loader.js'
import { addUsage } from './types.js'
import type { Attempt, EvalAgent, Grade, Outcome, Suite, Task } from './types.js'

/**
 * Eval runner.
 *
 * One attempt = one (task, agent, repeat). Attempts run strictly in series: the
 * MCP server's rate limits are per-IP, so parallelism buys nothing and would only
 * turn every run into a throttling benchmark.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = resolve(HERE, '..')
const DEFAULT_ENDPOINT = 'https://www.tldraw.com/api/app/mcp'

interface Options {
	suite: string
	runs: number
	endpoint: string
	tasks?: string[]
	model: string
	effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
	judgeModel: string
	useCache: boolean
	maxToolCalls: number
	attemptTimeoutMs: number
	infraRetries: number
	outDir: string
	dryRun: boolean
}

/**
 * Picks the suite to run when `--suite` is not given.
 *
 * `suites/local.csv` is gitignored and wins if present: real board links stay out
 * of a public repo, but you still get a bare `yarn eval` rather than having to
 * pass `--suite` on every invocation. The committed `default.csv` holds
 * placeholder slugs and exists to document the format.
 */
function defaultSuitePath() {
	const local = join(PACKAGE_ROOT, 'suites/local.csv')
	return existsSync(local) ? local : join(PACKAGE_ROOT, 'suites/default.csv')
}

function parseArgs(argv: string[]): Options {
	const flags = new Map<string, string>()
	const bare = new Set<string>()
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (!arg.startsWith('--')) continue
		const eq = arg.indexOf('=')
		if (eq !== -1) flags.set(arg.slice(2, eq), arg.slice(eq + 1))
		else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags.set(arg.slice(2), argv[++i])
		else bare.add(arg.slice(2))
	}

	const tasks = flags.get('tasks')
	return {
		suite: flags.get('suite') ?? defaultSuitePath(),
		runs: Number(flags.get('runs') ?? 3),
		endpoint: flags.get('endpoint') ?? DEFAULT_ENDPOINT,
		tasks: tasks ? tasks.split(',').map((entry) => entry.trim()) : undefined,
		model: flags.get('model') ?? 'claude-opus-5',
		effort: (flags.get('effort') ?? 'high') as Options['effort'],
		judgeModel: flags.get('judge-model') ?? 'claude-opus-5',
		useCache: !bare.has('no-cache'),
		maxToolCalls: Number(flags.get('max-tool-calls') ?? 12),
		attemptTimeoutMs: Number(flags.get('timeout') ?? 600) * 1000,
		infraRetries: Number(flags.get('infra-retries') ?? 1),
		outDir: flags.get('out') ?? join(PACKAGE_ROOT, 'runs'),
		dryRun: bare.has('dry-run'),
	}
}

/**
 * Loads `internal/mcp-evals/.env` if it exists.
 *
 * The key has to live somewhere that survives between commands. An exported
 * shell variable does not — every `yarn eval` you run from a different terminal,
 * or through a tool that spawns its own shell, starts with a clean environment
 * and fails on the preflight check below. A gitignored file next to the suite is
 * the one place that always works.
 *
 * An already-set environment variable wins: `process.loadEnvFile` does not
 * overwrite existing vars, so CI can inject a key without anyone deleting a
 * local `.env` first.
 */
function loadDotEnv() {
	try {
		process.loadEnvFile(join(PACKAGE_ROOT, '.env'))
	} catch {
		// No .env is fine — the key may already be exported.
	}
}

async function main() {
	loadDotEnv()
	const options = parseArgs(process.argv.slice(2))
	const suite = await loadSuite(options.suite)

	const tasks = suite.tasks.filter((task) => !options.tasks || options.tasks.includes(task.id))
	if (tasks.length === 0) {
		throw new Error(`No tasks selected. Suite has: ${suite.tasks.map((t) => t.id).join(', ')}`)
	}
	for (const task of tasks) {
		if (!suite.boards[task.board]) {
			throw new Error(`Task "${task.id}" references unknown board fixture "${task.board}"`)
		}
	}

	const mcp = new McpClient({
		endpoint: options.endpoint,
		cacheDir: join(PACKAGE_ROOT, '.cache'),
		useCache: options.useCache,
		log: (message) => console.log(message),
	})

	// Fail before spending a token if the endpoint is wrong or the server is off:
	// a 404 here is the kill switch or a bad URL, not a model problem.
	const info = (await mcp.initialize()) as { serverInfo?: { name?: string; version?: string } }
	console.log(
		`Connected to ${info.serverInfo?.name ?? 'unknown'} v${info.serverInfo?.version ?? '?'} at ${options.endpoint}`
	)

	if (options.dryRun) {
		await dryRun(mcp, suite, tasks)
		return
	}

	// Checked here rather than at the first model call: a paced suite can spend
	// minutes on screenshots before it ever talks to the API, and discovering a
	// missing key at that point wastes both the wait and the rate-limit budget.
	if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
		throw new Error(
			[
				'No Anthropic credentials found.',
				'',
				`Create ${join(PACKAGE_ROOT, '.env')} containing:`,
				'',
				'  ANTHROPIC_API_KEY=sk-ant-...',
				'',
				'(that file is gitignored). An exported ANTHROPIC_API_KEY also works.',
			].join('\n')
		)
	}

	const agent = createClaudeAgent({ model: options.model, effort: options.effort })
	const judge = createClaudeJudge({ model: options.judgeModel })

	const stamp = new Date().toISOString().replace(/[:.]/g, '-')
	const runDir = join(options.outDir, stamp)
	await mkdir(join(runDir, 'transcripts'), { recursive: true })

	const attempts: Attempt[] = []
	const total = tasks.length * options.runs
	let index = 0

	for (const task of tasks) {
		for (let run = 1; run <= options.runs; run++) {
			index++
			console.log(`\n[${index}/${total}] ${task.id} (${task.type}) run ${run}/${options.runs}`)

			let attempt: Attempt | undefined
			for (let tryIndex = 0; tryIndex <= options.infraRetries; tryIndex++) {
				attempt = await runAttempt({ task, suite, agent, judge, mcp, options, run, runDir })
				if (attempt.outcome !== 'infra_error') break
				if (tryIndex < options.infraRetries) {
					console.log(`  infra error (${attempt.error}); retrying`)
				}
			}

			attempts.push(attempt!)
			console.log(
				`  → ${attempt!.outcome} score=${attempt!.score.toFixed(2)} tools=${attempt!.toolCalls} ${Math.round(attempt!.wallMs / 1000)}s — ${attempt!.detail}`
			)

			await writeFile(
				join(runDir, 'results.jsonl'),
				attempts.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
				'utf8'
			)
		}
	}

	const summaries = summarize(attempts)
	const markdown = renderMarkdown(summaries, attempts)
	await writeFile(join(runDir, 'report.md'), markdown, 'utf8')

	console.log(`\n${markdown}`)
	console.log(`\nResults: ${join(runDir, 'results.jsonl')}`)
	console.log(`Report:  ${join(runDir, 'report.md')}`)
	console.log(`Images:  ${join(runDir, 'images')}   (the screenshots each agent saw)`)
}

/**
 * Pulls the screenshots the agent actually saw out of the transcript and writes
 * them beside it as PNGs.
 *
 * Two reasons. In a vision eval the image *is* the input, so "was the screenshot
 * any good?" is the first question you ask when a score moves — and answering it
 * should not mean hand-decoding base64. And a 170KB base64 blob makes the
 * transcript JSON unopenable, so swapping it for a pointer is what keeps the rest
 * of the transcript readable.
 */
/**
 * Renders an answer for a human to read.
 *
 * An `open` answer is a single prose string, and JSON-stringifying it would bury
 * the text behind escaped quotes and \n — unreadable in exactly the workflow this
 * field exists to serve. Graded answers are small structured objects, where the
 * JSON *is* the readable form.
 */
function renderAnswer(answer: unknown, fallback: string | null): string | undefined {
	if (answer === null || answer === undefined) return fallback ?? undefined
	if (typeof answer === 'object' && answer !== null) {
		const record = answer as Record<string, unknown>
		const keys = Object.keys(record)
		if (keys.length === 1 && keys[0] === 'answer' && typeof record.answer === 'string') {
			return record.answer
		}
	}
	return JSON.stringify(answer, null, 2)
}

async function saveTranscriptImages(transcript: unknown[], imagesDir: string, prefix: string) {
	const saved: string[] = []

	const walk = async (node: unknown): Promise<void> => {
		if (Array.isArray(node)) {
			for (const entry of node) await walk(entry)
			return
		}
		if (!node || typeof node !== 'object') return

		const record = node as Record<string, unknown>
		const source = record.source as { type?: string; data?: unknown } | undefined
		if (record.type === 'image' && source?.type === 'base64' && typeof source.data === 'string') {
			const file = `${prefix}-${saved.length + 1}.png`
			await mkdir(imagesDir, { recursive: true })
			await writeFile(join(imagesDir, file), Buffer.from(source.data, 'base64'))
			source.data = `(saved to images/${file})`
			saved.push(file)
			return
		}

		for (const value of Object.values(record)) await walk(value)
	}

	await walk(transcript)
	return saved
}

async function runAttempt(input: {
	task: Task
	suite: Suite
	agent: EvalAgent
	judge: ReturnType<typeof createClaudeJudge>
	mcp: McpClient
	options: Options
	run: number
	runDir: string
}): Promise<Attempt> {
	const { task, suite, agent, judge, mcp, options, run, runDir } = input
	const board = suite.boards[task.board]

	mcp.beginAttempt()
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), options.attemptTimeoutMs)
	const startedAt = Date.now()

	const base = {
		taskId: task.id,
		taskType: task.type,
		board: task.board,
		agent: agent.name,
		run,
	}
	const transcriptPath = join(
		runDir,
		'transcripts',
		`${task.id}-${agent.name.replace(/[^\w.-]/g, '_')}-${run}.json`
	)

	try {
		const result = await agent.run({
			task,
			board,
			systemPrompt: SYSTEM_PROMPT,
			userPrompt: buildUserPrompt(task, board),
			mcp,
			maxToolCalls: task.maxToolCalls ?? options.maxToolCalls,
			signal: controller.signal,
		})

		// Runs before the transcript is written, because it rewrites the base64 image
		// blocks in place into pointers at the PNGs it just saved.
		const images = await saveTranscriptImages(
			result.transcript,
			join(runDir, 'images'),
			`${task.id}-${agent.name.replace(/[^\w.-]/g, '_')}-${run}`
		)

		await writeFile(
			transcriptPath,
			JSON.stringify(
				{ task, board, images, transcript: result.transcript, finalText: result.rawFinalText },
				null,
				2
			),
			'utf8'
		)

		const usage = { ...result.usage }
		let grade: Grade
		let outcome: Outcome

		// An `open` task has nothing to grade, so a strict JSON envelope would only
		// add a failure mode for no benefit. Take whatever prose the block holds.
		const answer =
			task.type === 'open' && result.answer === null && result.answerBlock !== null
				? { answer: result.answerBlock }
				: result.answer

		if (result.stoppedBecause) {
			outcome = result.stoppedBecause
			grade = { score: 0, pass: false, detail: `stopped: ${result.stoppedBecause}` }
		} else if (answer === null) {
			// Distinct from a wrong answer on purpose: this is usually a prompt or
			// adapter problem, and folding it into wrong_answer hides that.
			outcome = 'malformed_answer'
			grade = { score: 0, pass: false, detail: 'no parseable <answer> block' }
		} else if (task.type === 'open') {
			// The attempt ran and its cost, latency, and tool count are all real — but
			// there is no ground truth, so claiming a pass or a failure here would be
			// inventing a verdict. Record it as measured-but-unjudged instead.
			outcome = 'ungraded'
			grade = { score: 0, pass: false, detail: 'no ground truth — measured, not graded' }
		} else {
			if (task.type === 'describe') {
				const described = await gradeDescribe(task, answer, judge)
				addUsage(usage, described.judgeUsage)
				grade = described
			} else if (task.type === 'locate') {
				grade = gradeLocate(task, answer)
			} else {
				grade = gradeFindMany(task, answer)
			}
			outcome = grade.pass ? 'pass' : 'wrong_answer'
		}

		return {
			...base,
			outcome,
			score: grade.score,
			detail: grade.detail,
			breakdown: grade.breakdown,
			answerText: renderAnswer(answer, result.answerBlock),
			calls: mcp.calls.map((call) => ({ name: call.name, args: call.args })),
			images,
			usage,
			// Counted from the MCP client's own log, not from anything the adapter
			// reports about itself, so an adapter cannot flatter its own tool budget.
			toolCalls: mcp.calls.length,
			rateLimitRetries: mcp.getRateLimitRetries(),
			wallMs: Date.now() - startedAt,
			agentMs: result.agentMs,
			mcpMs: mcp.getNetworkMs(),
			usedLocalCache: mcp.getUsedLocalCache(),
			transcriptPath,
		}
	} catch (error) {
		const aborted = controller.signal.aborted
		return {
			...base,
			outcome: aborted ? 'timeout' : 'infra_error',
			score: 0,
			detail: aborted ? 'attempt timed out' : describeError(error),
			usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
			toolCalls: mcp.calls.length,
			rateLimitRetries: mcp.getRateLimitRetries(),
			wallMs: Date.now() - startedAt,
			agentMs: 0,
			mcpMs: mcp.getNetworkMs(),
			usedLocalCache: mcp.getUsedLocalCache(),
			transcriptPath,
			error: describeError(error),
		}
	} finally {
		clearTimeout(timer)
	}
}

/**
 * Checks the plumbing without spending model tokens: resolves every board in the
 * suite and reports its pages. Run this after adding a fixture — a board that is
 * unpublished or unshared fails here rather than as a mystery low score later.
 */
async function dryRun(mcp: McpClient, suite: Suite, tasks: Task[]) {
	const boards = [...new Set(tasks.map((task) => task.board))]
	console.log(`\nDry run: resolving ${boards.length} board fixture(s), no model calls.\n`)

	let failures = 0
	for (const key of boards) {
		const board = suite.boards[key]
		const result = await mcp.callTool('get_board_info', { boardId: board.boardId })
		const text = result.content.map((block) => block.text ?? '').join(' ')
		if (result.isError) {
			failures++
			console.log(`✗ ${key} (${board.boardId}): ${text}`)
		} else {
			console.log(`✓ ${key} (${board.boardId}): ${text}`)
		}
	}

	console.log(
		`\n${boards.length - failures}/${boards.length} board fixtures resolved.` +
			(failures > 0 ? ' Fix the failures before running the suite.' : '')
	)
	if (failures > 0) process.exitCode = 1
}

main().catch((error) => {
	console.error(`\nEval run failed: ${describeError(error)}`)
	process.exitCode = 1
})
