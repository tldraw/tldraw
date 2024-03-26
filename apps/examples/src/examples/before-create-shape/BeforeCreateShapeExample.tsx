import { TLArrowShape, Tldraw } from 'tldraw'

export default function BeforeCreateShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.sideEffects.registerBeforeCreateHandler('shape', (shape, scope) => {
						// if this shape is being created by a different user in a multiplayer room, leave it as-is
						if (scope === 'remote') return shape

						// if it's not an arrow shape, leave it as-is
						if (!editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) return shape

						// if it already has a text label, don't overwrite it
						if (shape.props.text) return shape

						// other wise, if its an arrow shape without a text label, add a default text label
						return {
							...shape,
							props: {
								...shape.props,
								text: 'Hello, world!',
							},
						}
					})
				}}
			/>
		</div>
	)
}
