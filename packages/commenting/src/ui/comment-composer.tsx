import { ReactNode, useEffect, useRef } from 'react'
import { Avatar } from './avatar'
import './comments.css'
import { SendButton } from './send-button'

export interface CommentComposerProps {
	author: string
	placeholder: string
	/** Controlled input value. Omit for the presentational (display-only) composer. */
	value?: string
	onChange?(value: string): void
	/** Called on Send click or Enter. When set, the composer is interactive. */
	onSubmit?(): void
	sendLabel?: string
	disabled?: boolean
	autoFocus?: boolean
	/** The leading element before the field. Defaults to the author's avatar. */
	leading?: ReactNode
}

/** The input for writing a new comment, composed from Avatar and SendButton. Presentational
 *  by default; pass value/onChange/onSubmit to drive it as a real form. */
export function CommentComposer({
	author,
	placeholder,
	value,
	onChange,
	onSubmit,
	sendLabel = 'Send',
	disabled,
	autoFocus,
	leading,
}: CommentComposerProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	// Focus on the next frame rather than via the `autoFocus` attribute: the composer often
	// mounts from a canvas pointer event whose default focus handling would otherwise steal it
	// back, so we grab focus after that has run.
	useEffect(() => {
		if (!autoFocus) return
		const el = inputRef.current
		if (!el) return
		const raf = requestAnimationFrame(() => el.focus())
		return () => cancelAnimationFrame(raf)
	}, [autoFocus])

	return (
		<div className="cmt-composer">
			{leading ?? <Avatar name={author} />}
			<div className="cmt-composer__field">
				<input
					ref={inputRef}
					className="cmt-input"
					placeholder={placeholder}
					value={value}
					onChange={onChange ? (e) => onChange(e.target.value) : undefined}
					onKeyDown={
						onSubmit
							? (e) => {
									if (e.key === 'Enter') onSubmit()
								}
							: undefined
					}
				/>
				<SendButton label={sendLabel} onClick={onSubmit} disabled={disabled} />
			</div>
		</div>
	)
}
