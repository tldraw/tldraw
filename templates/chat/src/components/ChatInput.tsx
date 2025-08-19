import { FormEvent, useEffect, useRef, useState } from 'react'
import { DefaultSpinner, TldrawUiTooltip } from 'tldraw'
import { ImageIcon } from './icons/ImageIcon'
import { SendIcon } from './icons/SendIcon'
import { WhiteboardIcon } from './icons/WhiteboardIcon'

interface ChatInputProps {
	onSendMessage: (message: string) => void
	disabled?: boolean
	autoFocus?: boolean
}

export function ChatInput({ onSendMessage, disabled = false, autoFocus = false }: ChatInputProps) {
	const [input, setInput] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (!disabled && inputRef.current) {
			inputRef.current.focus()
		}
	}, [disabled])

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		if (input.trim() && !disabled) {
			onSendMessage(input)
			setInput('')
		}
	}

	return (
		<form onSubmit={handleSubmit} className="chat-input-form">
			<div className="input-container">
				<input
					ref={inputRef}
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder={disabled ? '' : 'Type your message...'}
					className="chat-input"
					disabled={disabled}
					autoFocus={autoFocus}
				/>
				{disabled && (
					<div className="input-spinner">
						<DefaultSpinner />
					</div>
				)}
			</div>
			<div className="chat-input-bottom">
				<TldrawUiTooltip content="Upload an image">
					<button type="button" className="icon-button" disabled={disabled}>
						<ImageIcon />
					</button>
				</TldrawUiTooltip>
				<TldrawUiTooltip content="Draw a sketch">
					<button type="button" className="icon-button" disabled={disabled}>
						<WhiteboardIcon />
					</button>
				</TldrawUiTooltip>
				<TldrawUiTooltip content="Send message">
					<button type="submit" disabled={disabled || !input.trim()} className="icon-button">
						<SendIcon />
					</button>
				</TldrawUiTooltip>
			</div>
		</form>
	)
}
