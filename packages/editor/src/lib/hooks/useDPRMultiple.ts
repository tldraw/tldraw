import { react } from '@tldraw/state'
import * as React from 'react'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

// Euclidean algorithm to find the GCD
function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b)
}

// Returns the lowest value that the given number can be multiplied by to reach an integer
export function nearestMultiple(float: number) {
	const decimal = float.toString().split('.')[1]
	if (!decimal) return 1
	const denominator = Math.pow(10, decimal.length)
	const numerator = parseInt(decimal, 10)
	return denominator / gcd(numerator, denominator)
}

export function useDPRMultiple() {
	const editor = useEditor()
	const container = useContainer()

	React.useEffect(() => {
		return react('useDPRMultiple', () => {
			const dpr = editor.getInstanceState().devicePixelRatio
			container.style.setProperty('--tl-dpr-multiple', nearestMultiple(dpr).toString())
		})
	}, [editor, container])
}
