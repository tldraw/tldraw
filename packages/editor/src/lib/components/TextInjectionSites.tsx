import { track } from '@tldraw/state'
import { nearestMultiple } from '../hooks/useDPRMultiple'
import { useEditor } from '../hooks/useEditor'
import { Matrix2d } from '../primitives/Matrix2d'

/*
This component renders shapes on the canvas. There are two stages: positioning
and styling the shape's container using CSS, and then rendering the shape's 
JSX using its shape util's render method. Rendering the "inside" of a shape is
more expensive than positioning it or changing its color, so we use React.memo
to wrap the inner shape and only re-render it when the shape's props change. 

The shape also receives props for its index and opacity. The index is used to
determine the z-index of the shape, and the opacity is used to set the shape's
opacity based on its own opacity and that of its parent's.
*/
export const TextInjectionSites = track(function TextInjectionSites() {
	const editor = useEditor()
	const data = editor._textInjectionSites.value
	if (!data) return null

	const transform = Matrix2d.toCssString(editor.getShapePageTransform(data.shape.id))
	const dpr = Math.floor(editor.instanceState.devicePixelRatio * 100) / 100
	const dprMultiple = nearestMultiple(dpr)
	const bounds = editor.getShapeGeometry(data.shape.id).bounds
	const widthRemainder = bounds.w % dprMultiple
	const _width = widthRemainder === 0 ? bounds.w : bounds.w + (dprMultiple - widthRemainder)
	const heightRemainder = bounds.h % dprMultiple
	const _height = heightRemainder === 0 ? bounds.h : bounds.h + (dprMultiple - heightRemainder)
	const width = Math.max(_width, dprMultiple)
	const height = Math.max(_height, dprMultiple)

	return (
		<div
			style={{
				transform,
				width,
				height,
				position: 'absolute',
			}}
		>
			{data.sites.map((site, i) => {
				return (
					<div
						key={i}
						className={`tl-text-injection-site ${
							site.hovered ? 'tl-text-injection-site__hover' : ''
						} ${site.hovered ? '' : 'tl-text-injection-site__out'}`}
						style={{
							left: site.x,
							top: site.y,
							borderLeftColor: site.justify === 'left' ? '#AAA' : 'transparent',
							borderRightColor: site.justify === 'right' ? '#AAA' : 'transparent',
							borderTopColor:
								site.justify === 'center' && site.align !== 'bottom' ? '#AAA' : 'transparent',
							borderBottomColor:
								site.justify === 'center' && site.align !== 'top' ? '#AAA' : 'transparent',
						}}
					></div>
				)
			})}
		</div>
	)
})
