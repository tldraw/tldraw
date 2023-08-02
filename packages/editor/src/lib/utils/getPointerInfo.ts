/** @public */
export function getPointerInfo(e: React.PointerEvent | PointerEvent) {
	;(e as any).isKilled = true

	return {
		point: {
			x: e.clientX,
			y: e.clientY,
			z: e.pressure,
		},
		shiftKey: e.shiftKey,
		altKey: e.altKey,
		ctrlKey: e.metaKey || e.ctrlKey,
		pointerId: e.pointerId,
		button: e.button,
		isPen: e.pointerType === 'pen',
	}
}
