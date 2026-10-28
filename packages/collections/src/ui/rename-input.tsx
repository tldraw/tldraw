import { useRef } from 'react'
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
 * An input for renaming in place. It saves once: Enter completes and unmounts the input, which then
 * blurs, and that second completion is dropped.
 * @public @react
 */
export function RenameInput({ defaultValue, className, onComplete, onCancel }: RenameInputProps) {
	const finished = useRef(false)
	const finish = (done: () => void) => {
		if (finished.current) return
		finished.current = true
		done()
	}

	return (
		<TldrawUiInput
			className={className}
			defaultValue={defaultValue}
			autoFocus
			autoSelect
			onComplete={(name) => finish(() => onComplete(name))}
			onBlur={(name) => finish(() => onComplete(name))}
			onCancel={() => finish(onCancel)}
		/>
	)
}
