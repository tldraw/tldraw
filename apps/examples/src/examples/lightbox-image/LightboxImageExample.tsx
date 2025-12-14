import { useCallback, useEffect } from 'react'
import {
	atom,
	StateNode,
	TLComponents,
	Tldraw,
	TLImageShape,
	TLPointerEventInfo,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './lightbox-image.css'

// There's a guide at the bottom of this file!

interface LightboxState {
	isOpen: boolean
	imageUrl: string | null
	aspectRatio: number
}

const lightboxState$ = atom<LightboxState>('lightboxState', {
	isOpen: false,
	imageUrl: null,
	aspectRatio: 1,
})

function setLightboxState(newState: Partial<LightboxState>) {
	lightboxState$.update((prev) => ({ ...prev, ...newState }))
}

function LightboxOverlay() {
	const editor = useEditor()
	const { isOpen, imageUrl, aspectRatio } = useValue(lightboxState$)

	const handleClose = useCallback(() => {
		setLightboxState({ isOpen: false })
	}, [])

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

	if (!isOpen || !imageUrl) return null

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
			<div className={`lightbox-content ${isOpen ? 'lightbox-content--open' : ''}`}>
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
		</div>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: LightboxOverlay,
}

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
This example demonstrates the creation of a lightbox overlay for images.
When you click on an image shape, instead of selecting it, we show a
full-screen lightbox view of the image.
*/
