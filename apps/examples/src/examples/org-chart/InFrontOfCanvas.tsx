import { Box, TLGeoShape, Vec, createShapeId, track, useEditor } from 'tldraw'
import { OrgArrowShape } from './OrgChartArrowShape'

type ButtonProps = {
	position: 'left' | 'right' | 'top' | 'bottom'
	screenBounds: Box
	pageBounds: Box
	shape: TLGeoShape
}

const BUTTON_DIMENSION = 24
const MARGIN = 10

function getPosition(
	position: ButtonProps['position'],
	bounds: Box,
	width: number,
	height: number,
	margin: number
) {
	switch (position) {
		case 'left':
			return {
				x: bounds.x - width - margin,
				y: bounds.y + bounds.height / 2 - height / 2,
			}
		case 'right':
			return {
				x: bounds.maxX + margin,
				y: bounds.y + bounds.height / 2 - height / 2,
			}
		case 'top': {
			return {
				x: bounds.x + bounds.width / 2 - width / 2,
				y: bounds.y - margin - height,
			}
		}
		case 'bottom': {
			return {
				x: bounds.x + bounds.width / 2 - width / 2,
				y: bounds.y + bounds.height + margin,
			}
		}
	}
}

function ExtendButton({ screenBounds, pageBounds, position, shape }: ButtonProps) {
	const editor = useEditor()
	const { x, y } = getPosition(position, screenBounds, BUTTON_DIMENSION, BUTTON_DIMENSION, MARGIN)

	function handleClick(position: ButtonProps['position']) {
		const id = createShapeId()
		const { x, y } = getPosition(position, pageBounds, pageBounds.width, pageBounds.height, 200)
		editor.batch(() => {
			editor.createShape({
				id,
				type: shape.type,
				x,
				y,
				props: {
					...shape.props,
				},
			})

			const arrowId = createShapeId()
			editor.createShape<OrgArrowShape>({
				id: arrowId,
				type: 'org-arrow',
				isLocked: true,
			})
			editor.sendToBack([arrowId])
			editor.createBinding({
				type: 'org-arrow',
				fromId: arrowId,
				toId: shape.id,
			})
			editor.createBinding({
				type: 'org-arrow',
				fromId: arrowId,
				toId: id,
			})
		})
	}

	return (
		<div
			onClick={() => handleClick(position)}
			style={{
				pointerEvents: 'all',
				position: 'absolute',
				background: 'white',
				left: x,
				top: y,
				width: BUTTON_DIMENSION,
				height: BUTTON_DIMENSION,
				border: '1px solid black',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				borderRadius: 3,
			}}
		>
			+
		</div>
	)
}

export const InFrontOfTheCanvas = track(function InFrontOfTheCanvas() {
	const editor = useEditor()
	const onlySelectedShape = editor.getOnlySelectedShape()
	if (!onlySelectedShape || onlySelectedShape.type !== 'geo') return null
	const geoShape = onlySelectedShape as TLGeoShape
	const bounds = editor.getShapePageBounds(onlySelectedShape)
	if (!bounds) return null
	const openMenus = editor.getOpenMenus()
	if (openMenus.length) return null
	const isTranslating = editor.isIn('select.translating')
	if (isTranslating) return null

	const topLeft = editor.pageToViewport(new Vec(bounds.minX, bounds.minY))
	const bottomRight = editor.pageToViewport(new Vec(bounds.maxX, bounds.maxY))
	const screenBounds = Box.FromPoints([topLeft, bottomRight])

	return (
		<>
			<ExtendButton
				position="left"
				screenBounds={screenBounds}
				pageBounds={bounds}
				shape={geoShape}
			/>
			<ExtendButton
				position="right"
				screenBounds={screenBounds}
				pageBounds={bounds}
				shape={geoShape}
			/>
			<ExtendButton
				position="top"
				screenBounds={screenBounds}
				pageBounds={bounds}
				shape={geoShape}
			/>
			<ExtendButton
				position="bottom"
				screenBounds={screenBounds}
				pageBounds={bounds}
				shape={geoShape}
			/>
		</>
	)
})
