import { tlenvReactive } from './environment'

function pressPointer(pointerType: string) {
	window.dispatchEvent(new PointerEvent('pointerdown', { pointerType, bubbles: true }))
}

describe('tlenvReactive.isCoarsePointer', () => {
	afterEach(() => {
		tlenvReactive.update((prev) => ({ ...prev, isCoarsePointer: false }))
	})

	it('flips to coarse on a touch pointerdown', () => {
		pressPointer('touch')
		expect(tlenvReactive.get().isCoarsePointer).toBe(true)
	})

	it('flips back to fine on a mouse pointerdown', () => {
		pressPointer('touch')
		pressPointer('mouse')
		expect(tlenvReactive.get().isCoarsePointer).toBe(false)
	})

	it('treats a pen as a fine pointer', () => {
		pressPointer('pen')
		expect(tlenvReactive.get().isCoarsePointer).toBe(false)
	})

	it('flips back to fine when a pen follows a touch', () => {
		pressPointer('touch')
		pressPointer('pen')
		expect(tlenvReactive.get().isCoarsePointer).toBe(false)
	})
})
