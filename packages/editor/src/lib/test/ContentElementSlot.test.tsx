import { act, render } from '@testing-library/react'
import { BaseBoxShapeUtil, createShapeId, Editor, RecordProps, T, TLShape } from '../..'
import { TldrawEditor } from '../TldrawEditor'

const PERSISTENT_SHAPE_TYPE = 'test-persistent'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[PERSISTENT_SHAPE_TYPE]: { w: number; h: number }
	}
}

type IPersistentShape = TLShape<typeof PERSISTENT_SHAPE_TYPE>

// App-owned element registry and parking lot, the way an app using
// getContentElement would keep elements alive across editor sessions.
const elements = new Map<string, HTMLElement>()
let parkingLot: HTMLDivElement
const releaseCalls: Array<{ shapeId: string; element: HTMLElement; slotWasConnected: boolean }> = []

class PersistentShapeUtil extends BaseBoxShapeUtil<IPersistentShape> {
	static override type = PERSISTENT_SHAPE_TYPE
	static override props: RecordProps<IPersistentShape> = {
		w: T.number,
		h: T.number,
	}
	getDefaultProps(): IPersistentShape['props'] {
		return { w: 100, h: 100 }
	}
	getIndicatorPath() {
		return undefined
	}
	component() {
		return null
	}
	override getAppOwnedElement(shape: IPersistentShape) {
		let element = elements.get(shape.id)
		if (!element) {
			element = document.createElement('div')
			element.dataset.testElementFor = shape.id
			elements.set(shape.id, element)
		}
		return element
	}
	override onReleaseAppOwnedElement(shape: IPersistentShape, element: HTMLElement) {
		releaseCalls.push({
			shapeId: shape.id,
			element,
			slotWasConnected: element.parentElement?.isConnected ?? false,
		})
		parkingLot.appendChild(element)
	}
}

function getSlotFor(shapeId: string) {
	return document.querySelector(`[data-shape-id="${shapeId}"] .tl-content-slot`)
}

describe('content element slot', () => {
	beforeEach(() => {
		elements.clear()
		releaseCalls.length = 0
		parkingLot = document.createElement('div')
		document.body.appendChild(parkingLot)
	})

	afterEach(() => {
		parkingLot.remove()
	})

	async function renderEditor() {
		let editor!: Editor
		const result = await act(async () =>
			render(
				<TldrawEditor
					shapeUtils={[PersistentShapeUtil]}
					onMount={(e) => {
						editor = e
					}}
				/>
			)
		)
		return { ...result, editor }
	}

	it('adopts the app-owned element into the shape and releases it before editor unmount', async () => {
		const { editor, unmount } = await renderEditor()
		const id = createShapeId()

		await act(async () => {
			editor.createShape<IPersistentShape>({ id, type: PERSISTENT_SHAPE_TYPE, x: 0, y: 0 })
		})

		const element = elements.get(id)!
		expect(element).toBeDefined()
		expect(element.parentElement).toBe(getSlotFor(id))
		expect(element.isConnected).toBe(true)

		await act(async () => {
			unmount()
		})

		// The release callback fired exactly once, while the slot was still
		// connected to the document, so a state-preserving move was possible.
		expect(releaseCalls).toHaveLength(1)
		expect(releaseCalls[0]).toMatchObject({ shapeId: id, element, slotWasConnected: true })
		// The app reclaimed the element into its parking lot and it survived teardown.
		expect(element.parentElement).toBe(parkingLot)
		expect(element.isConnected).toBe(true)
	})

	it('releases the element when the shape is deleted', async () => {
		const { editor, unmount } = await renderEditor()
		const id = createShapeId()

		await act(async () => {
			editor.createShape<IPersistentShape>({ id, type: PERSISTENT_SHAPE_TYPE, x: 0, y: 0 })
		})

		const element = elements.get(id)!
		expect(element.parentElement).toBe(getSlotFor(id))

		await act(async () => {
			editor.deleteShape(id)
		})

		expect(releaseCalls).toHaveLength(1)
		expect(releaseCalls[0]).toMatchObject({ shapeId: id, element, slotWasConnected: true })
		expect(element.parentElement).toBe(parkingLot)

		await act(async () => {
			unmount()
		})

		// The slot is gone; no second release for the deleted shape.
		expect(releaseCalls).toHaveLength(1)
	})

	it('re-adopts a parked element when the editor remounts, without recreating it', async () => {
		const first = await renderEditor()
		const id = createShapeId()

		await act(async () => {
			first.editor.createShape<IPersistentShape>({ id, type: PERSISTENT_SHAPE_TYPE, x: 0, y: 0 })
		})

		const element = elements.get(id)!

		await act(async () => {
			first.unmount()
		})
		expect(element.parentElement).toBe(parkingLot)

		const second = await renderEditor()
		await act(async () => {
			second.editor.createShape<IPersistentShape>({ id, type: PERSISTENT_SHAPE_TYPE, x: 0, y: 0 })
		})

		// The same element instance was adopted into the new editor's slot.
		expect(elements.get(id)).toBe(element)
		expect(element.parentElement).toBe(getSlotFor(id))

		await act(async () => {
			second.unmount()
		})
		expect(element.parentElement).toBe(parkingLot)
	})

	it('keeps the element in the same DOM position when z-order changes', async () => {
		const { editor, unmount } = await renderEditor()
		const id = createShapeId()
		const otherId = createShapeId()

		await act(async () => {
			editor.createShape<IPersistentShape>({ id, type: PERSISTENT_SHAPE_TYPE, x: 0, y: 0 })
			editor.createShape<IPersistentShape>({
				id: otherId,
				type: PERSISTENT_SHAPE_TYPE,
				x: 50,
				y: 50,
			})
		})

		const element = elements.get(id)!
		const slot = getSlotFor(id)
		expect(element.parentElement).toBe(slot)

		await act(async () => {
			editor.sendToBack([id])
			editor.bringToFront([id])
		})

		// No release fired and the element is still in the same slot node.
		expect(releaseCalls).toHaveLength(0)
		expect(element.parentElement).toBe(slot)

		await act(async () => {
			unmount()
		})
	})
})
