import { useMemo, useState } from 'react'
import {
	BaseBoxShapeUtil,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	RecordProps,
	T,
	Tldraw,
	TLShape,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const PERSISTENT_IFRAME_SHAPE_TYPE = 'persistent-iframe'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[PERSISTENT_IFRAME_SHAPE_TYPE]: { w: number; h: number }
	}
}

type IPersistentIframeShape = TLShape<typeof PERSISTENT_IFRAME_SHAPE_TYPE>

// [1]
const iframes = new Map<string, HTMLIFrameElement>()

let parkingLot: HTMLDivElement | undefined
function getParkingLot() {
	if (!parkingLot) {
		parkingLot = document.createElement('div')
		parkingLot.style.position = 'fixed'
		parkingLot.style.top = '-10000px'
		parkingLot.style.left = '-10000px'
		parkingLot.style.visibility = 'hidden'
		document.body.appendChild(parkingLot)
	}
	return parkingLot
}

// [2]
function moveElementInto(parent: HTMLElement, element: HTMLElement) {
	if (element.isConnected && parent.isConnected && 'moveBefore' in parent) {
		;(parent as any).moveBefore(element, null)
	} else {
		parent.appendChild(element)
	}
}

const IFRAME_CONTENT = `
<style>body { font-family: sans-serif; margin: 16px; }</style>
<h3>I keep my state</h3>
<p>Count: <output id="count">0</output></p>
<button onclick="count.value = Number(count.value) + 1">Increment</button>
<p><input placeholder="Type something…" /></p>
<p>Unmount the editor, then mount it again. In a browser with Node.moveBefore
(Chromium 133+, Firefox 144+) this document never reloads.</p>
`

// [3]
class PersistentIframeShapeUtil extends BaseBoxShapeUtil<IPersistentIframeShape> {
	static override type = PERSISTENT_IFRAME_SHAPE_TYPE
	static override props: RecordProps<IPersistentIframeShape> = {
		w: T.number,
		h: T.number,
	}

	getDefaultProps(): IPersistentIframeShape['props'] {
		return { w: 360, h: 280 }
	}

	component() {
		// The shape's chrome; the iframe itself is slotted in by the editor.
		return null
	}

	getIndicatorPath(shape: IPersistentIframeShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	// [4]
	override getAppOwnedElement(shape: IPersistentIframeShape) {
		let iframe = iframes.get(shape.id)
		if (!iframe) {
			iframe = document.createElement('iframe')
			iframe.srcdoc = IFRAME_CONTENT
			iframe.style.width = '100%'
			iframe.style.height = '100%'
			iframe.style.border = '1px solid #ccc'
			iframe.style.borderRadius = '8px'
			iframe.style.backgroundColor = 'white'
			iframe.style.pointerEvents = 'all'
			iframes.set(shape.id, iframe)
		}
		return iframe
	}

	// [5]
	override onReleaseAppOwnedElement(shape: IPersistentIframeShape, element: HTMLElement) {
		moveElementInto(getParkingLot(), element)
	}
}

const customShapeUtils = [PersistentIframeShapeUtil]

export default function PersistentIframeExample() {
	// [6]
	const store = useMemo(
		() =>
			createTLStore({
				shapeUtils: [...defaultShapeUtils, ...customShapeUtils],
				bindingUtils: defaultBindingUtils,
			}),
		[]
	)
	const [isEditorMounted, setIsEditorMounted] = useState(true)

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			<div style={{ padding: 8 }}>
				<button onClick={() => setIsEditorMounted((mounted) => !mounted)}>
					{isEditorMounted ? 'Unmount editor' : 'Mount editor'}
				</button>
			</div>
			<div style={{ flex: 1, position: 'relative' }}>
				{isEditorMounted ? (
					<Tldraw
						store={store}
						shapeUtils={customShapeUtils}
						onMount={(editor) => {
							const hasIframeShape = editor
								.getCurrentPageShapes()
								.some((shape) => shape.type === PERSISTENT_IFRAME_SHAPE_TYPE)
							if (!hasIframeShape) {
								editor.createShape({ type: PERSISTENT_IFRAME_SHAPE_TYPE, x: 200, y: 100 })
							}
						}}
					/>
				) : (
					<div style={{ padding: 16 }}>The editor is unmounted. The iframe is parked.</div>
				)}
			</div>
		</div>
	)
}

/*
Introduction:

Shape content renders inside the editor's React tree, so unmounting the editor — to lazy-mount
the canvas, reclaim memory, or recover from a crash — normally destroys any embedded content.
This example keeps an iframe alive across editor sessions using the shape util's content
element lifecycle: `getContentElement` and `onReleaseContentElement`.

[1]
The app owns the elements. We keep one iframe per shape in a registry, and a hidden "parking
lot" div on document.body where iframes live while no editor is mounted. The parking lot is
hidden with `visibility: hidden` rather than removed from the DOM: `Node.moveBefore` only
preserves state when the element stays connected to the document.

[2]
`Node.moveBefore` (Chromium 133+, Firefox 144+) moves an element to a new parent without
resetting its state — iframes don't reload, videos keep playing. In browsers without it we
fall back to `appendChild`, which moves the element but reloads the iframe.

[3]
A regular shape util. The shape stays a normal canvas citizen: geometry, hit-testing,
z-ordering, and the indicator all work as usual.

[4]
`getContentElement` returns the app-owned element for a shape. While the shape is mounted,
tldraw guarantees the element is never unmounted, recreated, or relocated — reorders,
reparenting, and culling never move it, so the iframe never reloads. tldraw adopts the
element with `moveBefore` where available, so re-mounting the editor picks the iframe up
from the parking lot without a reload.

[5]
`onReleaseContentElement` is called before the element's slot is destroyed: when the shape
is deleted, when the page changes, and when the editor unmounts (including error teardown).
It runs while the slot is still connected to the document, so moving the element to the
parking lot here preserves its state.

[6]
The store is created outside the Tldraw component so the document survives unmounting the
editor. Toggle the button: the editor unmounts, the iframe moves to the parking lot, and on
re-mount the same iframe is adopted back into the shape with its state intact.

Note: the iframe sets `pointer-events: all`, so you interact with its content directly and
move the shape by its edges or the selection handles. A production shape would gate
interaction the way tldraw's embed shape does (interact when selected or editing).
*/
