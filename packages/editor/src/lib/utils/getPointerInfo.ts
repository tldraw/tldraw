export function getPointerInfo(e: React.PointerEvent | PointerEvent, container: HTMLElement) {
	;(e as any).isKilled = true

	const { top, left } = container.getBoundingClientRect()

	return {
		point: {
			x: e.clientX - left,
			y: e.clientY - top,
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
