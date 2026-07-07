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
}: CommentComposerProps) {
	return (
		<div className="cmt-composer">
			<Avatar name={author} />
			<input
				className="cmt-input"
				placeholder={placeholder}
				autoFocus={autoFocus}
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
	)
}
