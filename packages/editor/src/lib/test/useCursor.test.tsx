import { act, render } from '@testing-library/react'
import { createTLStore } from '../config/createTLStore'
import { Editor } from '../editor/Editor'
import { getCursor } from '../hooks/useCursor'
import { TL_CONTAINER_CLASS, TldrawEditor } from '../TldrawEditor'

describe('useCursor', () => {
	it('maps the static schema cursor types to their css variables', async () => {
		let editor: Editor
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		await act(async () => {
			render(<TldrawEditor store={store} onMount={(e) => void (editor = e)} />)
		})
		const container = document.querySelector(`.${TL_CONTAINER_CLASS}`) as HTMLElement

		for (const type of ['rotate', 'resize-edge', 'resize-corner', 'default'] as const) {
			act(() => editor.setCursor({ type, rotation: 0 }))
			expect(container.style.getPropertyValue('--tl-cursor')).toBe(`var(--tl-cursor-${type})`)
		}
	})
})

describe('getCursor', () => {
	it('returns the css variable for the static cursor types', () => {
		for (const type of ['rotate', 'resize-edge', 'resize-corner', 'default'] as const) {
			expect(getCursor(type)).toBe(`var(--tl-cursor-${type})`)
			expect(getCursor(type, Math.PI / 2, '#000000')).toBe(`var(--tl-cursor-${type})`)
		}
	})

	it('encodes the colour so a hex value does not end the data url as a fragment', () => {
		const css = getCursor('ew-resize', 0, '#000000')
		expect(css).toContain("style='color: %23000000;'")
		expect(css).not.toContain('#')
	})
})
