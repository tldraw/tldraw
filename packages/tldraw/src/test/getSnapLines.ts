import { Editor } from '@tldraw/editor'

const simplifyNumber = (n: number) => {
	if (Math.abs(Math.round(n) - n) < 0.0001) {
		return Math.round(n)
	}
	return n
}
export const getSnapLines = (scene: Editor) => {
	const result = []
	for (const snap of scene.snaps.getLines()) {
		if (snap.type !== 'points') {
			throw new Error('Expected only points snap')
		}
		snap.points.sort((a, b) => {
			const xdiff = simplifyNumber(a.x) - simplifyNumber(b.x)
			if (xdiff === 0) {
				return simplifyNumber(a.y) - simplifyNumber(b.y)
			}
			return xdiff
		})
		result.push(snap.points.map((p) => `${simplifyNumber(p.x)},${simplifyNumber(p.y)}`).join(' '))
	}
	return result.sort()
}
