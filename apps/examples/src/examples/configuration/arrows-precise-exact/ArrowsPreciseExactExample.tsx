import { ArrowShapeUtil, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const shapeUtils = [
	ArrowShapeUtil.configure({
		shouldBeExact: (editor, isPrecise) => isPrecise,
	}),
]

export default function ArrowsPreciseExactExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw shapeUtils={shapeUtils} />
		</div>
	)
}
