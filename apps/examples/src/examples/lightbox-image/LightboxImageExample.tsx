import { useCallback, useEffect } from 'react'
import {
	AssetRecordType,
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
					// put image on the canvas
					const assetId = AssetRecordType.createId()
					const imageWidth = 1048
					const imageHeight = 1600

					editor.createAssets([
						{
							id: assetId,
							type: 'image',
							typeName: 'asset',
							props: {
								name: 'goldfinch.png',
								src: '/goldfinch.png',
								w: imageWidth,
								h: imageHeight,
								mimeType: 'image/png',
								isAnimated: false,
							},
							meta: {},
						},
					])

					editor.createShape({
						type: 'image',
						x: (window.innerWidth - imageWidth) / 2,
						y: (window.innerHeight - imageHeight) / 2,
						props: {
							assetId,
							w: imageWidth,
							h: imageHeight,
						},
					})

					// set up lightbox click behavior
					type PointingShapeState = StateNode & {
						hitShape: TLImageShape
						onPointerUp(info: TLPointerEventInfo): void
					}

					const pointingShapeState =
						editor.getStateDescendant<PointingShapeState>('select.pointing_shape')
					if (!pointingShapeState) return

					const originalOnPointerUp = pointingShapeState.onPointerUp.bind(pointingShapeState)

					pointingShapeState.onPointerUp = function (info: TLPointerEventInfo) {
						const hitShape = this.hitShape

						if (hitShape && editor.isShapeOfType<TLImageShape>(hitShape, 'image')) {
							const assetId = hitShape.props.assetId

							if (assetId) {
								const asset = editor.getAsset(assetId)

								if (asset && asset.type === 'image' && asset.props.src) {
									const aspectRatio = hitShape.props.w / hitShape.props.h

									setLightboxState({
										isOpen: true,
										imageUrl: asset.props.src,
										aspectRatio,
									})

									this.parent.transition('idle', info)
									return
								}
							}
						}

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
