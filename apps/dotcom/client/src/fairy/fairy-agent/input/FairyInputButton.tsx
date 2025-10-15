interface FairyInputButtonProps {
	isGenerating: boolean
	inputValue: string
	disabled: boolean
}

export function FairyInputButton({ isGenerating, inputValue, disabled }: FairyInputButtonProps) {
	return (
		<button
			type="submit"
			disabled={disabled}
			className="fairy-input__submit"
			title={isGenerating && inputValue === '' ? 'Stop' : 'Send'}
		>
			{isGenerating && inputValue === '' ? '⏹' : '👄'}
		</button>
	)
}
