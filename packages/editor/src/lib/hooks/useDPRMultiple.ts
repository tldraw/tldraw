import { EffectScheduler } from '@tldraw/state'
import * as React from 'react'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

// Euclidean algorithm to find the GCD
function gcd(a: number, b: number): number {
  return (b === 0) ? a : gcd(b, a % b)
}

function nearestMultiple(float: number) {
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
		const setDPRMultiple = (s: number) => container.style.setProperty('--tl-dpr-multiple', s.toString())

		const scheduler = new EffectScheduler('useDPRMultiple', () => {
			const dpr = editor.instanceState.devicePixelRatio
			setDPRMultiple(nearestMultiple(dpr))
		})

		scheduler.attach()
		scheduler.execute()

		return () => {
			scheduler.detach()
		}
	}, [editor, container])
}
