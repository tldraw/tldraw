import { Tldraw, createShapeId, createTableShapeProps } from 'tldraw'
import 'tldraw/tldraw.css'

export default function TableShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					const id = createShapeId('table')
					// [1]
					editor.createShape({
						id,
						type: 'table',
						x: 100,
						y: 100,
						props: createTableShapeProps([
							['Name', 'Role', 'Team'],
							['Ada', 'Engineer', 'Editor'],
							['Grace', 'Designer', 'Dotcom'],
							['Alan', 'Researcher', 'SDK'],
						]),
					})
					editor.select(id)
					editor.zoomToSelection()
				}}
			/>
		</div>
	)
}

/*
[1]
`createTableShapeProps` builds the `rows`, `columns` and `cells` props from an array of rows. The
other props, like `color`, `font` and `size`, fall back to the shape's defaults and show up in the
style panel like any other shape's styles.
*/
