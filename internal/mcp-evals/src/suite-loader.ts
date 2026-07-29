import { readFile } from 'node:fs/promises'
import type { BoardFixture, NormalizedBox, Suite, Task } from './types.js'

/**
 * Suite loading.
 *
 * The primary input is a CSV whose only required columns are `prompt` and
 * `board_url`. That is enough to run a task and measure what it cost; adding
 * expectation columns to a row promotes it from `open` (measured, ungraded) to a
 * graded task type. The point is that you can start collecting cost and latency
 * numbers the moment you have prompts, and build ground truth incrementally
 * without ever rewriting the file format.
 *
 * `.json` suites still load, for cases where the ground truth is too structured
 * to sit comfortably in a cell.
 */

export async function loadSuite(path: string): Promise<Suite> {
	const raw = await readFile(path, 'utf8')
	return path.toLowerCase().endsWith('.csv') ? parseCsvSuite(raw) : (JSON.parse(raw) as Suite)
}

// --- board URLs -------------------------------------------------------------

/**
 * Extracts the board id the MCP server wants from whatever the user pasted.
 *
 * The server takes a bare slug and explicitly rejects anything containing "/",
 * but nobody has a bare slug to hand — they have a URL from the address bar,
 * often with viewport query params or a page fragment stuck to it. Normalizing
 * here means a paste always works and a typo fails with a message that says what
 * was wrong.
 */
export function parseBoardUrl(input: string): { boardId: string; kind: 'published' | 'shared' } {
	const trimmed = input.trim()
	if (trimmed.length === 0) throw new Error('board_url is empty')

	// A bare slug (no scheme, no path) is already what the server wants.
	if (!trimmed.includes('/')) {
		return { boardId: stripDecoration(trimmed), kind: 'published' }
	}

	let url: URL
	try {
		url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
	} catch {
		throw new Error(`Could not parse "${input}" as a board URL or slug`)
	}

	const segments = url.pathname.split('/').filter(Boolean)
	const marker = segments.findIndex((segment) => segment === 'p' || segment === 'f')

	if (marker === -1 || !segments[marker + 1]) {
		// `/r/:slug` is a live multiplayer room. It is not a published or shared
		// board, so the server will never resolve it — say so rather than letting it
		// fail later as a generic "no public board found".
		if (segments.includes('r')) {
			throw new Error(
				`"${input}" is a live room URL (/r/). The MCP server only serves published boards (/p/) and link-shared files (/f/).`
			)
		}
		throw new Error(
			`Could not find a board slug in "${input}". Expected a tldraw.com/p/:slug or tldraw.com/f/:slug URL.`
		)
	}

	return {
		boardId: stripDecoration(segments[marker + 1]),
		kind: segments[marker] === 'f' ? 'shared' : 'published',
	}
}

function stripDecoration(slug: string) {
	// Query strings and fragments are already gone if this came through URL, but a
	// bare-slug paste can still carry them.
	return slug.split('?')[0].split('#')[0]
}

// --- CSV suite --------------------------------------------------------------

const REQUIRED_COLUMNS = ['prompt', 'board_url']

export function parseCsvSuite(text: string): Suite {
	const rows = parseCsv(text)
	if (rows.length === 0) throw new Error('CSV is empty')

	const header = rows[0].map((cell) =>
		cell
			.trim()
			.toLowerCase()
			.replace(/[\s-]+/g, '_')
	)
	// `url` and `board` are accepted spellings of `board_url`; people type what
	// their spreadsheet already calls the column.
	const normalizedHeader = header.map((name) =>
		name === 'url' || name === 'board' ? 'board_url' : name
	)

	for (const required of REQUIRED_COLUMNS) {
		if (!normalizedHeader.includes(required)) {
			throw new Error(
				`CSV is missing a required "${required}" column. Found: ${normalizedHeader.join(', ')}`
			)
		}
	}

	const boards: Record<string, BoardFixture> = {}
	const tasks: Task[] = []
	const seenIds = new Set<string>()

	for (let index = 1; index < rows.length; index++) {
		const cells = rows[index]
		// Ignore blank lines rather than failing on them — trailing newlines and
		// spreadsheet exports produce them constantly.
		if (cells.every((cell) => cell.trim() === '')) continue

		const row = new Map<string, string>()
		normalizedHeader.forEach((name, column) => row.set(name, (cells[column] ?? '').trim()))

		// Row number as the user sees it in a spreadsheet: header is row 1.
		const lineNumber = index + 1
		try {
			const { task, board } = parseRow(row, lineNumber)
			if (seenIds.has(task.id)) {
				throw new Error(`duplicate task id "${task.id}" — ids must be unique across the suite`)
			}
			seenIds.add(task.id)
			boards[board.key] = board.fixture
			tasks.push(task)
		} catch (error) {
			throw new Error(
				`CSV row ${lineNumber}: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	if (tasks.length === 0) throw new Error('CSV contained a header but no task rows')
	return { boards, tasks }
}

function parseRow(row: Map<string, string>, lineNumber: number) {
	const prompt = row.get('prompt') ?? ''
	if (prompt === '') throw new Error('prompt is empty')

	const { boardId, kind } = parseBoardUrl(row.get('board_url') ?? '')
	// Board fixtures are keyed by id so several rows can share one board without
	// duplicating it, and the report can group by board.
	const boardKey = boardId
	const fixture: BoardFixture = {
		boardId,
		name: row.get('board_name') || `${kind} board ${boardId}`,
		approxShapes: optionalNumber(row, 'approx_shapes'),
		notes: row.get('notes') || undefined,
	}

	const id = row.get('id') || `row-${lineNumber}`
	const base = {
		id,
		board: boardKey,
		prompt,
		maxToolCalls: optionalNumber(row, 'max_tool_calls'),
	}

	const type = inferType(row)

	switch (type) {
		case 'locate': {
			const box = parseBox(row.get('box') ?? '')
			return {
				board: { key: boardKey, fixture },
				task: {
					...base,
					type: 'locate',
					expect: { page: optionalNumber(row, 'page') ?? 0, box },
					minIou: optionalNumber(row, 'min_iou'),
				} satisfies Task,
			}
		}
		case 'find-many': {
			const items = splitList(row.get('items') ?? '').map((entry, position) => ({
				id: `item-${position + 1}`,
				match: splitAliases(entry),
			}))
			if (items.length === 0) throw new Error('items column is empty')
			return {
				board: { key: boardKey, fixture },
				task: {
					...base,
					type: 'find-many',
					expect: { items },
					minF1: optionalNumber(row, 'min_f1'),
				} satisfies Task,
			}
		}
		case 'describe': {
			const rubric = splitList(row.get('rubric') ?? '')
			const mustMention = splitList(row.get('must_mention') ?? '').map(splitAliases)
			const reference = row.get('reference') ?? ''
			if (rubric.length === 0 && mustMention.length === 0) {
				throw new Error(
					'type is "describe" but neither rubric nor must_mention is set — there would be nothing to grade against'
				)
			}
			if (rubric.length > 0 && reference === '') {
				throw new Error('a rubric needs a reference description for the judge to score against')
			}
			return {
				board: { key: boardKey, fixture },
				task: {
					...base,
					type: 'describe',
					reference,
					rubric,
					mustMention,
					minRecall: optionalNumber(row, 'min_recall'),
				} satisfies Task,
			}
		}
		case 'open':
			return {
				board: { key: boardKey, fixture },
				task: { ...base, type: 'open' } satisfies Task,
			}
	}
}

/**
 * Picks the task type from whichever expectation columns the row actually filled
 * in, so the common cases need no `type` column at all. An explicit `type` wins,
 * because a row that declares a type and then fails to supply its ground truth
 * should error rather than silently downgrade to `open` and report as ungraded.
 */
function inferType(row: Map<string, string>): 'describe' | 'locate' | 'find-many' | 'open' {
	const explicit = row
		.get('type')
		?.toLowerCase()
		.replace(/[\s_]+/g, '-')
	if (explicit) {
		if (
			explicit === 'describe' ||
			explicit === 'locate' ||
			explicit === 'find-many' ||
			explicit === 'open'
		) {
			return explicit
		}
		throw new Error(`unknown type "${explicit}" (expected describe, locate, find-many, or open)`)
	}

	if (row.get('box')) return 'locate'
	if (row.get('items')) return 'find-many'
	if (row.get('rubric') || row.get('must_mention')) return 'describe'
	return 'open'
}

/** `0.1,0.2,0.3,0.4` — the four normalized edges of the ground-truth box. */
function parseBox(value: string): NormalizedBox {
	const parts = value
		.split(/[,\s]+/)
		.filter(Boolean)
		.map(Number)
	if (parts.length !== 4 || parts.some((entry) => !Number.isFinite(entry))) {
		throw new Error(`box must be four numbers like "0.1,0.2,0.4,0.5" (got "${value}")`)
	}
	if (parts.some((entry) => entry < 0 || entry > 1)) {
		// Catches pixel coordinates pasted straight off the screenshot, which would
		// otherwise silently never match and look like a model failure.
		throw new Error(
			`box values must be normalized 0–1, not pixels (got "${value}"). Divide x by 1200 and y by 630.`
		)
	}
	return [parts[0], parts[1], parts[2], parts[3]]
}

/** Items and criteria are separated by `|`. */
function splitList(value: string): string[] {
	return value
		.split('|')
		.map((entry) => entry.trim())
		.filter(Boolean)
}

/** Alternative spellings of one item are separated by `;`. */
function splitAliases(value: string): string[] {
	const aliases = value
		.split(';')
		.map((entry) => entry.trim())
		.filter(Boolean)
	return aliases.length > 0 ? aliases : [value.trim()]
}

function optionalNumber(row: Map<string, string>, key: string): number | undefined {
	const raw = row.get(key)
	if (!raw) return undefined
	const value = Number(raw)
	if (!Number.isFinite(value)) throw new Error(`${key} must be a number (got "${raw}")`)
	return value
}

// --- CSV parsing ------------------------------------------------------------

/**
 * RFC 4180 CSV reader.
 *
 * Hand-rolled rather than split(',') because prompts are prose: they contain
 * commas constantly, quoted phrases occasionally, and newlines whenever someone
 * writes a multi-line instruction in a spreadsheet cell. Splitting on commas
 * would corrupt exactly the column that matters most.
 */
export function parseCsv(text: string): string[][] {
	const rows: string[][] = []
	let row: string[] = []
	let field = ''
	let inQuotes = false
	// Strip a UTF-8 BOM; Excel writes one and it would otherwise poison the first
	// header name, making `prompt` look missing.
	const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

	for (let index = 0; index < input.length; index++) {
		const char = input[index]

		if (inQuotes) {
			if (char === '"') {
				if (input[index + 1] === '"') {
					field += '"'
					index++
				} else {
					inQuotes = false
				}
			} else {
				field += char
			}
			continue
		}

		if (char === '"') {
			inQuotes = true
		} else if (char === ',') {
			row.push(field)
			field = ''
		} else if (char === '\r') {
			// Swallow CR; the LF that follows ends the row.
		} else if (char === '\n') {
			row.push(field)
			rows.push(row)
			row = []
			field = ''
		} else {
			field += char
		}
	}

	if (field !== '' || row.length > 0) {
		row.push(field)
		rows.push(row)
	}

	return rows
}
