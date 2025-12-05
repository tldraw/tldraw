import { FairySign, SIGN_PARTS } from '@tldraw/fairy-shared'

export function getRandomFairySign(): FairySign {
	const sunSign = SIGN_PARTS[Math.floor(Math.random() * SIGN_PARTS.length)]
	const moonSign = SIGN_PARTS[Math.floor(Math.random() * SIGN_PARTS.length)]
	const risingSign = SIGN_PARTS[Math.floor(Math.random() * SIGN_PARTS.length)]
	return {
		sun: sunSign,
		moon: moonSign,
		rising: risingSign,
	}
}
