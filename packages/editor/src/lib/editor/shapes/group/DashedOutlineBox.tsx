import { useValue } from '@tldraw/state'
import { useEditor } from '../../../hooks/useEditor'
import { Box2d } from '../../../primitives/Box2d'
import { getPerfectDashProps } from '../shared/getPerfectDashProps'

export function DashedOutlineBox({ bounds, className }: { bounds: Box2d; className: string }) {
	const editor = useEditor()

	const zoomLevel = useValue('zoom level', () => editor.getZoomLevel(), [editor])

	return (
		<g className={className} pointerEvents="none" strokeLinecap="round" strokeLinejoin="round">
			{bounds.sides.map((side, i) => {
				const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
					side[0].dist(side[1]),
					1 / zoomLevel,
					{
						style: 'dashed',
						lengthRatio: 4,
					}
				)

				return (
					<line
						key={i}
						x1={side[0].x}
						y1={side[0].y}
						x2={side[1].x}
						y2={side[1].y}
						strokeDasharray={strokeDasharray}
						strokeDashoffset={strokeDashoffset}
					/>
				)
			})}
		</g>
	)
}
