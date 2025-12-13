import { useCallback, useEffect, useState } from 'react'
import {
	StateNode,
	TLComponents,
	TLImageShape,
	TLPointerEventInfo,
	Tldraw,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './lightbox-image.css'

// There's a guide at the bottom of this file!

// [1]
interface LightboxState {
	isOpen: boolean
	imageUrl: string | null
	aspectRatio: number
}

// [2]
let lightboxState: LightboxState = {
	isOpen: false,
	imageUrl: null,
	aspectRatio: 1,
}
let lightboxListeners: Set<() => void> = new Set()

function setLightboxState(newState: Partial<LightboxState>) {
	lightboxState = { ...lightboxState, ...newState }
	lightboxListeners.forEach((listener) => listener())
}

function useLightboxState() {
	const [state, setState] = useState(lightboxState)
	useEffect(() => {
		const listener = () => setState({ ...lightboxState })
		lightboxListeners.add(listener)
		return () => {
			lightboxListeners.delete(listener)
		}
	}, [])
	return state
}

// [3]
function LightboxOverlay() {
	const editor = useEditor()
	const { isOpen, imageUrl, aspectRatio } = useLightboxState()

	const handleClose = useCallback(() => {
		setLightboxState({ isOpen: false })
		// Small delay before clearing the URL to allow the close animation to complete
		setTimeout(() => {
			setLightboxState({ imageUrl: null })
		}, 300)
	}, [])

	// Close on escape key
	useEffect(() => {
		if (!isOpen) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				handleClose()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [isOpen, handleClose])

	if (!imageUrl) return null

	// Calculate the size to fill most of the viewport while maintaining aspect ratio
	const viewport = editor.getViewportScreenBounds()
	const maxWidth = viewport.width * 0.85
	const maxHeight = viewport.height * 0.85

	let displayWidth: number
	let displayHeight: number

	if (maxWidth / aspectRatio <= maxHeight) {
		displayWidth = maxWidth
		displayHeight = maxWidth / aspectRatio
	} else {
		displayHeight = maxHeight
		displayWidth = maxHeight * aspectRatio
	}

	return (
		<div
			className={`lightbox-overlay ${isOpen ? 'lightbox-overlay--open' : ''}`}
			onClick={handleClose}
		>
			<div className="lightbox-backdrop" />
			<div
				className={`lightbox-content ${isOpen ? 'lightbox-content--open' : ''}`}
				onClick={(e) => e.stopPropagation()}
			>
				<img
					src={imageUrl}
					alt="Lightbox view"
					style={{
						width: displayWidth,
						height: displayHeight,
					}}
					className="lightbox-image"
				/>
			</div>
			<button className="lightbox-close" onClick={handleClose} aria-label="Close lightbox">
				×
			</button>
		</div>
	)
}

// [4]
const components: TLComponents = {
	InFrontOfTheCanvas: LightboxOverlay,
}

// [5]
export default function LightboxImageExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="lightbox-image-example"
				components={components}
				onMount={(editor) => {
					// [6]
					type PointingShapeState = StateNode & {
						hitShape: TLImageShape
						onPointerUp(info: TLPointerEventInfo): void
					}

					const pointingShapeState =
						editor.getStateDescendant<PointingShapeState>('select.pointing_shape')
					if (!pointingShapeState) return

					// Store the original handler
					const originalOnPointerUp = pointingShapeState.onPointerUp.bind(pointingShapeState)

					// [7]
					pointingShapeState.onPointerUp = async function (info: TLPointerEventInfo) {
						const hitShape = this.hitShape

						// Check if we clicked on an image shape
						if (hitShape && editor.isShapeOfType<TLImageShape>(hitShape, 'image')) {
							const assetId = hitShape.props.assetId

							if (assetId) {
								// Resolve the asset URL
								const url = await editor.resolveAssetUrl(assetId, {
									screenScale: 1,
								})

								if (url) {
									// Calculate aspect ratio from shape dimensions
									const aspectRatio = hitShape.props.w / hitShape.props.h

									// Open lightbox with the image
									setLightboxState({
										isOpen: true,
										imageUrl: url,
										aspectRatio,
									})

									// Transition back to idle without selecting the shape
									this.parent.transition('idle', info)
									return
								}
							}
						}

						// Fall back to original behavior for non-image shapes
						originalOnPointerUp(info)
					}
				}}
			/>
		</div>
	)
}

/*
This example shows how to create a lightbox overlay for images in tldraw.
When you click on an image shape, instead of selecting it, we show a
full-screen lightbox view of the image.

[1] Lightbox state interface
We define the state needed for the lightbox: whether it's open, the image URL,
and the aspect ratio for proper sizing.

[2] Simple state management
We use a simple pub/sub pattern to share lightbox state between the onMount
callback and the React component. This avoids needing to wrap everything in
a context provider.

[3] LightboxOverlay component
This component is rendered "in front of the canvas" using the InFrontOfTheCanvas
component override. It shows:
- A semi-transparent backdrop that darkens the canvas
- The image centered and scaled to fit the viewport
- A close button
- CSS transitions for smooth animations

The overlay can be closed by:
- Clicking the backdrop
- Clicking the close button
- Pressing the Escape key

[4] Component overrides
We pass our LightboxOverlay as the InFrontOfTheCanvas component, which renders
it above the canvas but below other UI elements like the toolbar.

[5] Main example component
The Tldraw component is configured with:
- A persistence key to save the canvas state
- Our custom components
- An onMount callback to set up the click behavior override

[6] Getting the pointing_shape state
We access the SelectTool's pointing_shape child state, which handles pointer
interactions when clicking on shapes. We type it to include the hitShape property
and onPointerUp method we need to access.

[7] Overriding onPointerUp
We replace the onPointerUp handler with our custom implementation that:
1. Checks if the clicked shape is an image
2. If so, resolves the asset URL and opens the lightbox
3. Transitions back to idle without selecting the shape
4. Falls back to the original behavior for non-image shapes

Note: We store a reference to the original handler and call it for non-image
shapes to preserve the default behavior.
*/
