import { Editor } from 'tldraw'
import { createEditorAPI } from './api'

export interface ExecutionError {
	message: string
	line?: number
	column?: number
	stack?: string
}

export interface ExecutionResult {
	success: boolean
	error?: ExecutionError
}

/**
 * Parse an error to extract line number from stack trace.
 * The new Function() wrapper adds 2 lines of overhead (function declaration + opening brace).
 */
function parseErrorLocation(error: Error, code: string): { line?: number; column?: number } {
	const stack = error.stack || ''

	// Look for patterns like "<anonymous>:3:5" or "Function:3:5" or "eval:3:5"
	// These indicate the line:column within our dynamically created function
	const patterns = [
		/<anonymous>:(\d+):(\d+)/,
		/Function:(\d+):(\d+)/,
		/eval.*:(\d+):(\d+)/,
		/at eval \(eval at.*:(\d+):(\d+)\)/,
	]

	for (const pattern of patterns) {
		const match = stack.match(pattern)
		if (match) {
			// The function wrapper adds 2 lines of overhead, so subtract 2
			// Line numbers are 1-based
			const rawLine = parseInt(match[1], 10)
			const column = parseInt(match[2], 10)
			const adjustedLine = Math.max(1, rawLine - 2)

			// Validate that the line is within the code bounds
			const lineCount = code.split('\n').length
			if (adjustedLine <= lineCount) {
				return { line: adjustedLine, column }
			}
		}
	}

	// Try to parse SyntaxError messages which include line info differently
	const syntaxMatch = error.message.match(/line (\d+)/i)
	if (syntaxMatch) {
		return { line: parseInt(syntaxMatch[1], 10) }
	}

	return {}
}

/**
 * Execute user code in a controlled environment.
 *
 * The code is executed using new Function() with the editor and api objects
 * in scope. All operations are wrapped in editor.run() for atomic transactions.
 *
 * Security note: This uses new Function() which is safer than eval() but still
 * executes arbitrary code. Only use with trusted input in local development.
 *
 * @param code - The JavaScript code to execute
 * @param editor - The tldraw editor instance
 * @returns Promise with execution result
 */
export async function executeCode(code: string, editor: Editor): Promise<ExecutionResult> {
	// Create a restore point before executing user code
	const markId = editor.markHistoryStoppingPoint('code-execution')

	try {
		// Create the curated API for the code editor
		const api = createEditorAPI(editor)

		// Execute code in a transaction for atomic updates
		let result: unknown
		editor.run(() => {
			// Create a function with controlled scope
			// Only editor and api are available, not window or document
			const fn = new Function('editor', 'api', code)
			result = fn(editor, api)
		})

		// Handle async results if the user code returns a promise
		if (result instanceof Promise) {
			await result
		}

		return { success: true }
	} catch (error) {
		// Roll back to the restore point to recover from bad state
		editor.bailToMark(markId)

		const isError = error instanceof Error
		const message = isError ? error.message : String(error)
		const stack = isError ? error.stack : undefined
		const location = isError ? parseErrorLocation(error, code) : {}

		// Log to console for debugging
		console.error('Code execution error:', error)

		return {
			success: false,
			error: {
				message,
				stack,
				...location,
			},
		}
	}
}
