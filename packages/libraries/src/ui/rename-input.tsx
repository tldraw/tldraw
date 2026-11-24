import { useEffect, useRef } from 'react'
import { TldrawUiInput } from 'tldraw'

/** @public */
export interface RenameInputProps {
	defaultValue: string
	className?: string
	/** Called once, on Enter or blur, with the input's value. */
	onComplete(name: string): void
	onCancel(): void
}

/**
 * An input for renaming in place. Escape cancels. It saves once: Enter completes and unmounts the
 * input, which then blurs, and that second completion is dropped. An edit still pending when the input unmounts without
 * a blur, e.g. when the menu holding it closes, is saved too.
 * @public @react
 */
export function RenameInput({ defaultValue, className, onComplete, onCancel }: RenameInputProps) {
	const finished = useRef(false)
	const value = useRef(defaultValue)
	const latestOnComplete = useRef(onComplete)
	const latestOnCancel = useRef(onCancel)
	const inputRef = useRef<HTMLInputElement>(null)
	const finish = (done: () => void) => {
		if (finished.current) return
		finished.current = true
		done()
	}

	useEffect(() => {
		latestOnComplete.current = onComplete
		latestOnCancel.current = onCancel
	})
	// Escape cancels here before a dialog around the input sees it, as the dialog would close too.
	useEffect(() => {
		const input = inputRef.current
		const win = input && input.ownerDocument.defaultView
		if (!input || !win) return
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Escape' || e.target !== input || e.isComposing) return
			e.preventDefault()
			e.stopPropagation()
			if (finished.current) return
			finished.current = true
			latestOnCancel.current()
		}
		win.addEventListener('keydown', onKeyDown, true)
		return () => win.removeEventListener('keydown', onKeyDown, true)
	}, [])
	useEffect(() => {
		return () => {
			if (value.current !== defaultValue) finish(() => latestOnComplete.current(value.current))
		}
	}, [defaultValue])

	return (
		<TldrawUiInput
			ref={inputRef}
			className={className}
			defaultValue={defaultValue}
			autoFocus
			autoSelect
			onValueChange={(v) => (value.current = v)}
			onComplete={(name) => finish(() => onComplete(name))}
			onBlur={(name) => finish(() => onComplete(name))}
			onCancel={() => finish(onCancel)}
		/>
	)
}
