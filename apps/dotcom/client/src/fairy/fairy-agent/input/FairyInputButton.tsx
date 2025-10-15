import { useEffect, useRef, useState } from 'react'

interface FairyInputButtonProps {
	isGenerating: boolean
	inputValue: string
	disabled: boolean
}

export function FairyInputButton({ isGenerating, inputValue, disabled }: FairyInputButtonProps) {
	const [currentEmoji, setCurrentEmoji] = useState(0) // 0 for biting lip, 1 for normal lips
	const [isAlternating, setIsAlternating] = useState(false)
	const emojiIntervalRef = useRef<NodeJS.Timeout | null>(null)
	const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	useEffect(() => {
		if (isAlternating) {
			emojiIntervalRef.current = setInterval(() => {
				setCurrentEmoji((prev) => (prev === 0 ? 1 : 0))
			}, 500)
		} else {
			if (emojiIntervalRef.current) {
				clearInterval(emojiIntervalRef.current)
				emojiIntervalRef.current = null
			}
			setCurrentEmoji(0)
		}

		return () => {
			if (emojiIntervalRef.current) {
				clearInterval(emojiIntervalRef.current)
				emojiIntervalRef.current = null
			}
		}
	}, [isAlternating])

	useEffect(() => {
		if (inputValue !== '') {
			if (!isAlternating) {
				setIsAlternating(true)
			}

			if (inactivityTimeoutRef.current) {
				clearTimeout(inactivityTimeoutRef.current)
			}

			inactivityTimeoutRef.current = setTimeout(() => {
				setIsAlternating(false)
			}, 500)
		} else {
			setIsAlternating(false)
			if (inactivityTimeoutRef.current) {
				clearTimeout(inactivityTimeoutRef.current)
				inactivityTimeoutRef.current = null
			}
		}

		return () => {
			if (inactivityTimeoutRef.current) {
				clearTimeout(inactivityTimeoutRef.current)
			}
		}
	}, [inputValue, isAlternating])

	return (
		<button
			type="submit"
			disabled={disabled}
			className="fairy-input__submit"
			title={isGenerating && inputValue === '' ? 'Stop' : 'Send'}
		>
			{isGenerating && inputValue === ''
				? '🤫'
				: isAlternating
					? currentEmoji === 0
						? '🫦'
						: '👄'
					: '🫦'}
		</button>
	)
}
