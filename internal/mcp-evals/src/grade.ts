import type {
	DescribeTask,
	FindManyTask,
	Grade,
	LocateTask,
	NormalizedBox,
	Task,
	TokenUsage,
} from './types.js'

/**
 * Graders, one per task type.
 *
 * `locate` and `find-many` are graded with plain arithmetic against ground truth
 * generated from the fixture. Only `describe` needs a model in the loop, and even
 * there half the score is deterministic — so a judge that drifts between versions
 * can move the score but cannot silently invent or destroy a pass on its own.
 */

// --- locate -----------------------------------------------------------------

export function gradeLocate(task: LocateTask, answer: unknown): Grade {
	const parsed = parseLocateAnswer(answer)
	if (!parsed) {
		return { score: 0, pass: false, detail: 'answer was not {page, box:[x0,y0,x1,y1]}' }
	}

	if (parsed.page !== task.expect.page) {
		return {
			score: 0,
			pass: false,
			detail: `wrong page: said ${parsed.page}, expected ${task.expect.page}`,
			breakdown: { page: parsed.page, expectedPage: task.expect.page },
		}
	}

	const truth = task.expect.box
	const iou = intersectionOverUnion(parsed.box, truth)

	if (task.minIou !== undefined) {
		const pass = iou >= task.minIou
		return {
			score: pass ? 1 : 0,
			pass,
			detail: pass
				? `IoU ${iou.toFixed(2)} ≥ ${task.minIou}`
				: `IoU ${iou.toFixed(2)} < ${task.minIou}`,
			breakdown: { iou, box: parsed.box, expectedBox: truth },
		}
	}

	// Default: "find where X is" is answered correctly when the agent points at the
	// thing, even if it draws a looser or tighter box around it than the fixture did.
	const center: [number, number] = [
		(parsed.box[0] + parsed.box[2]) / 2,
		(parsed.box[1] + parsed.box[3]) / 2,
	]
	const hit =
		center[0] >= truth[0] && center[0] <= truth[2] && center[1] >= truth[1] && center[1] <= truth[3]

	return {
		score: hit ? 1 : 0,
		pass: hit,
		detail: hit
			? `center (${center[0].toFixed(2)}, ${center[1].toFixed(2)}) inside target`
			: `center (${center[0].toFixed(2)}, ${center[1].toFixed(2)}) outside target box`,
		breakdown: { iou, center, box: parsed.box, expectedBox: truth },
	}
}

function parseLocateAnswer(answer: unknown): { page: number; box: NormalizedBox } | undefined {
	if (!answer || typeof answer !== 'object') return undefined
	const record = answer as Record<string, unknown>
	const page = record.page
	const box = record.box
	if (typeof page !== 'number' || !Number.isInteger(page) || page < 0) return undefined
	if (!Array.isArray(box) || box.length !== 4 || box.some((n) => typeof n !== 'number')) {
		return undefined
	}
	// Normalize orientation so a box given as [x1,y1,x0,y0] still grades sanely —
	// corner ordering is a formatting slip, not a wrong answer about where the thing is.
	const [a, b, c, d] = box as number[]
	return { page, box: [Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d)] }
}

function intersectionOverUnion(a: NormalizedBox, b: NormalizedBox) {
	const x0 = Math.max(a[0], b[0])
	const y0 = Math.max(a[1], b[1])
	const x1 = Math.min(a[2], b[2])
	const y1 = Math.min(a[3], b[3])
	if (x1 <= x0 || y1 <= y0) return 0
	const overlap = (x1 - x0) * (y1 - y0)
	const areaA = Math.max(0, a[2] - a[0]) * Math.max(0, a[3] - a[1])
	const areaB = Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1])
	const union = areaA + areaB - overlap
	return union <= 0 ? 0 : overlap / union
}

// --- find-many --------------------------------------------------------------

export function gradeFindMany(task: FindManyTask, answer: unknown): Grade {
	const items = parseStringList(answer, 'items')
	if (!items) return { score: 0, pass: false, detail: 'answer was not {items: string[]}' }

	const truth = task.expect.items
	const matchedTruth = new Set<string>()
	let truePositives = 0

	for (const claim of items) {
		const normalized = claim.toLowerCase()
		// First unmatched truth item that this claim satisfies. Matching greedily and
		// one-to-one stops a single vague answer ("some boxes") from claiming credit
		// for several distinct findings.
		const hit = truth.find(
			(entry) =>
				!matchedTruth.has(entry.id) && entry.match.some((m) => normalized.includes(m.toLowerCase()))
		)
		if (hit) {
			matchedTruth.add(hit.id)
			truePositives++
		}
	}

	const precision = items.length === 0 ? 0 : truePositives / items.length
	const recall = truth.length === 0 ? 0 : truePositives / truth.length
	const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
	const threshold = task.minF1 ?? 0.7
	const missed = truth.filter((entry) => !matchedTruth.has(entry.id)).map((entry) => entry.id)

	return {
		score: f1,
		pass: f1 >= threshold,
		detail: `found ${truePositives}/${truth.length}, ${items.length - truePositives} spurious, F1 ${f1.toFixed(2)}`,
		breakdown: {
			precision,
			recall,
			f1,
			threshold,
			matched: [...matchedTruth],
			missed,
			claimed: items,
		},
	}
}

// --- describe ---------------------------------------------------------------

export interface Judge {
	/** Scores each rubric criterion true/false against the agent's description. */
	score(input: {
		reference: string
		rubric: string[]
		description: string
	}): Promise<{ verdicts: boolean[]; usage: TokenUsage; notes?: string }>
}

export async function gradeDescribe(
	task: DescribeTask,
	answer: unknown,
	judge: Judge
): Promise<Grade & { judgeUsage: TokenUsage }> {
	const parsed = parseDescribeAnswer(answer)
	if (!parsed) {
		return {
			score: 0,
			pass: false,
			detail: 'answer was not {summary, entities[], regions[]}',
			judgeUsage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
		}
	}

	// Deterministic half: did the description actually name the things on the board?
	// This runs first and needs no model, so a judge outage degrades the score's
	// resolution rather than blocking the run.
	const haystack = [parsed.summary, ...parsed.entities, ...parsed.regions].join('\n').toLowerCase()
	const found = task.mustMention.filter((aliases) =>
		aliases.some((alias) => haystack.includes(alias.toLowerCase()))
	)
	const missing = task.mustMention
		.filter((aliases) => !found.includes(aliases))
		.map((aliases) => aliases[0])
	const recall = task.mustMention.length === 0 ? 1 : found.length / task.mustMention.length
	const minRecall = task.minRecall ?? 0.8

	const judged = await judge.score({
		reference: task.reference,
		rubric: task.rubric,
		description: parsed.summary,
	})
	const met = judged.verdicts.filter(Boolean).length
	const rubricScore = task.rubric.length === 0 ? 1 : met / task.rubric.length

	// Both halves must hold. Recall alone passes a keyword salad; the rubric alone
	// passes a fluent description of the wrong board.
	const pass = recall >= minRecall && rubricScore >= 0.75
	const failures = task.rubric.filter((_, index) => !judged.verdicts[index])

	return {
		score: (recall + rubricScore) / 2,
		pass,
		detail: pass
			? `recall ${found.length}/${task.mustMention.length}, rubric ${met}/${task.rubric.length}`
			: `recall ${found.length}/${task.mustMention.length}${missing.length ? ` (missing: ${missing.join(', ')})` : ''}, rubric ${met}/${task.rubric.length}`,
		breakdown: {
			recall,
			minRecall,
			missing,
			rubricScore,
			rubricFailures: failures,
			judgeNotes: judged.notes,
		},
		judgeUsage: judged.usage,
	}
}

function parseDescribeAnswer(
	answer: unknown
): { summary: string; entities: string[]; regions: string[] } | undefined {
	if (!answer || typeof answer !== 'object') return undefined
	const record = answer as Record<string, unknown>
	if (typeof record.summary !== 'string' || record.summary.trim().length === 0) return undefined
	return {
		summary: record.summary,
		entities: parseStringList(answer, 'entities') ?? [],
		regions: parseStringList(answer, 'regions') ?? [],
	}
}

function parseStringList(answer: unknown, key: string): string[] | undefined {
	if (!answer || typeof answer !== 'object') return undefined
	const value = (answer as Record<string, unknown>)[key]
	if (!Array.isArray(value)) return undefined
	const strings = value.filter((entry): entry is string => typeof entry === 'string')
	// A partly-malformed list is still gradeable; only a wholly wrong shape isn't.
	return strings.length === value.length ? strings : strings
}

// --- shared -----------------------------------------------------------------

/** The answer shape each task type requires, quoted verbatim into the prompt. */
export function answerSchemaFor(task: Task): string {
	switch (task.type) {
		case 'describe':
			return `{"summary": "<prose description of the board>", "entities": ["<each named thing you saw>"], "regions": ["<each distinct area or section>"]}`
		case 'locate':
			return `{"page": <0-based page index>, "box": [x0, y0, x1, y1]}

The box is in normalized screenshot coordinates: 0,0 is the top-left of the screenshot for that page and 1,1 is the bottom-right. Give the tightest box that contains the thing you were asked to find.`
		case 'find-many':
			return `{"items": ["<one short phrase per thing you found>"]}

List one entry per distinct finding. Do not pad the list — a wrong entry costs as much as a missed one.`
		case 'open':
			return `{"answer": "<your answer>"}`
	}
}
