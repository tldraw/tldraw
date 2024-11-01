import { useRef } from 'react'
import { Tldraw, react } from 'tldraw'
import 'tldraw/tldraw.css'
import './style.css'

export default function BasicExample() {
	const ref = useRef<HTMLDivElement>(null)
	return (
		<div className="tldraw__editor" ref={ref}>
			<Tldraw
				persistenceKey="example"
				onMount={(editor) => {
					let prevShape = editor.getOnlySelectedShape()
					return react('update onlySelectedShape border', () => {
						const shape = editor.getOnlySelectedShape()
						if (shape !== prevShape) {
							if (prevShape) {
								ref.current
									?.querySelector(`[data-shape-id="${prevShape.id}"]`)
									?.classList.remove('with-padlet-border')
							}
							if (shape) {
								ref.current
									?.querySelector(`[data-shape-id="${shape.id}"]`)
									?.classList.add('with-padlet-border')
							}
						}
						prevShape = shape
					})
				}}
			/>
		</div>
	)
}
