import { answerSchemaFor } from './grade.js'
import type { BoardFixture, Task } from './types.js'

/**
 * Prompt construction.
 *
 * Every agent under test gets byte-identical prompts, so a score difference is a
 * difference between agents and not between the harnesses around them. The
 * answer-envelope instruction lives here rather than in each adapter for the
 * same reason.
 */

export const SYSTEM_PROMPT = [
	'You are answering questions about a whiteboard hosted on tldraw.com, using the MCP tools available to you.',
	'',
	'The tools are the only way to see the board. `get_board_info` lists the board’s pages; `get_shared_board_screenshot` returns a 1200x630 PNG of one page. Call `get_board_info` first when a board may have more than one page.',
	'',
	'Screenshots are expensive and rate limited. Look carefully at each one before deciding you need another, and do not re-request a page you have already seen.',
	'',
	'When you have finished, end your reply with a single <answer> block. It must contain one JSON object and nothing else — no markdown, no commentary outside it. Any prose you want to write belongs inside the JSON string values, not around them. Put nothing after the closing tag.',
].join('\n')

export function buildUserPrompt(task: Task, board: BoardFixture): string {
	return [
		`Board id: ${board.boardId}`,
		'',
		task.prompt,
		'',
		'Answer with a single <answer> block whose entire contents are one JSON object of exactly this shape (starting with { and ending with }):',
		'',
		answerSchemaFor(task),
	].join('\n')
}
