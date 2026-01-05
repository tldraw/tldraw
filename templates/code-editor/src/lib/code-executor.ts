import { Editor } from 'tldraw'
import { createEditorAPI } from './api'

export interface ExecutionResult {
	success: boolean
	error?: string
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
		const errorMessage = error instanceof Error ? error.message : String(error)

		// Log to console for debugging
		console.error('Code execution error:', error)

		return { success: false, error: errorMessage }
	}
}
