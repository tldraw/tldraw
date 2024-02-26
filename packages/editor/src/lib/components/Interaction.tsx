import { track, useValue } from '@tldraw/state'
import classNames from 'classnames'
import { PointerEvent } from 'react'
import { COARSE_HANDLE_RADIUS, HANDLE_RADIUS } from '../constants'
import { useEditor } from '../hooks/useEditor'
import { Vec } from '../primitives/Vec'
import { SVGContainer } from './SVGContainer'

interface HandleControlProps {
	position: Vec
	onPointerDown: (event: PointerEvent) => void
}

export const HandleControl = track(function HandleControl({
	position,
	onPointerDown,
}: HandleControlProps) {
	const editor = useEditor()
	const isCoarse = useValue('coarse pointer', () => editor.getInstanceState().isCoarsePointer, [
		editor,
	])

	const bgRadius = isCoarse ? COARSE_HANDLE_RADIUS : HANDLE_RADIUS
	const fgRadius = 4

	const viewportPosition = editor.pageToViewport(position)

	return (
		<SVGContainer
			style={{ transform: `translate(${viewportPosition.x}px, ${viewportPosition.y}px)` }}
		>
			<g
				className={classNames('tl-handle')}
				onPointerDown={(e) => {
					onPointerDown(e)
				}}
			>
				<circle className="tl-handle__bg" r={bgRadius} />
				<circle className="tl-handle__fg" r={fgRadius} />
			</g>
		</SVGContainer>
	)
})
