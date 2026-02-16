import { useEffect, useState } from 'react'
import { continueRender, delayRender } from 'remotion'
import { highlightCode, type HighlightedLine } from './highlight'

export function useHighlight(code: string, language: string): HighlightedLine[] | null {
	const [lines, setLines] = useState<HighlightedLine[] | null>(null)
	const [handle] = useState(() => delayRender('Highlighting code'))

	useEffect(() => {
		highlightCode(code, language)
			.then((result) => {
				setLines(result)
			})
			.catch(() => {
				// Fall back to unhighlighted rendering
			})
			.finally(() => {
				continueRender(handle)
			})
	}, [code, language, handle])

	return lines
}
