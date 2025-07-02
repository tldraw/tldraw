import { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import { useTldrawAiExample } from './useTldrawAiExample'

function App() {
	const [editor, setEditor] = useState<Editor | null>(null) // [1]
	return (
		<div className="tldraw-ai-container">
			<Tldraw persistenceKey="tldraw-ai-demo-2" onMount={setEditor} />
			{editor && <InputBar editor={editor} />}
		</div>
	)
}

function InputBar({ editor }: { editor: Editor }) {
	const ai = useTldrawAiExample(editor)

	// The state of the prompt input, either idle or loading with a cancel callback
	const [isGenerating, setIsGenerating] = useState(false)

	// A stashed cancel function that we can call if the user clicks the button while loading
	const rCancelFn = useRef<(() => void) | null>(null)

	// Put the editor and ai helpers onto the window for debugging. You can run commands like `ai.prompt('draw a unicorn')` in the console.
	useEffect(() => {
		if (!editor) return
		;(window as any).editor = editor
		;(window as any).ai = ai
	}, [ai, editor])

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()

			// If we have a stashed cancel function, call it and stop here
			if (rCancelFn.current) {
				rCancelFn.current()
				rCancelFn.current = null
				setIsGenerating(false)
				return
			}

			try {
				const formData = new FormData(e.currentTarget)
				const value = formData.get('input') as string

				// We call the ai module with the value from the input field and get back a promise and a cancel function
				const { promise, cancel } = ai.prompt({ message: value, stream: true })

				// Stash the cancel function so we can call it if the user clicks the button again
				rCancelFn.current = cancel

				// Set the state to loading
				setIsGenerating(true)

				// ...wait for the promise to resolve
				await promise

				// ...then set the state back to idle
				setIsGenerating(false)
				rCancelFn.current = null
			} catch (e: any) {
				console.error(e)
				setIsGenerating(false)
				rCancelFn.current = null
			}
		},
		[ai]
	)

	return (
		<div className="prompt-input">
			<form onSubmit={handleSubmit}>
				<input name="input" type="text" autoComplete="off" placeholder="Enter your prompt…" />
				<button>{isGenerating ? <DefaultSpinner /> : 'Send'}</button>
			</form>
		</div>
	)
}

export default App
