import { createShapeId, Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './z-order.css'

// [1]
const REORDER_OPERATIONS = [
	{ label: 'Send to back', action: 'sendToBack' },
	{ label: 'Send backward', action: 'sendBackward' },
	{ label: 'Bring forward', action: 'bringForward' },
	{ label: 'Bring to front', action: 'bringToFront' },
] as const

function ControlPanel() {
	const editor = useEditor()

	return (
		<div className="tlui-menu control-panel">
			{REORDER_OPERATIONS.map(({ label, action }) => (
				<TldrawUiButton
					type="normal"
					key={action}
					onClick={() => {
						// [2]
						const selectedIds = editor.getSelectedShapeIds()
						if (selectedIds.length === 0) return

						switch (action) {
							case 'sendToBack':
								editor.sendToBack(selectedIds)
								break
							case 'sendBackward':
								editor.sendBackward(selectedIds)
								break
							case 'bringForward':
								editor.bringForward(selectedIds)
								break
							case 'bringToFront':
								editor.bringToFront(selectedIds)
								break
						}
					}}
				>
					{label}
				</TldrawUiButton>
			))}
		</div>
	)
}

export default function ZOrderExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [3]
					const shapes = [
						{
							id: createShapeId(),
							type: 'geo' as const,
							x: 100,
							y: 100,
							props: { w: 200, h: 200, color: 'blue' as const },
						},
						{
							id: createShapeId(),
							type: 'geo' as const,
							x: 200,
							y: 150,
							props: { w: 200, h: 200, color: 'red' as const },
						},
						{
							id: createShapeId(),
							type: 'geo' as const,
							x: 300,
							y: 200,
							props: { w: 200, h: 200, color: 'green' as const },
						},
					]

					editor.createShapes(shapes)
					editor.selectAll()
				}}
				components={{
					TopPanel: ControlPanel,
				}}
			/>
		</div>
	)
}

/*
[1]
Define the four reordering operations. sendToBack and bringToFront move shapes to the absolute
bottom or top of the stacking order. sendBackward and bringForward move shapes one position
relative to overlapping shapes.

[2]
Each method accepts an array of shape IDs. When multiple shapes are selected, their relative
order is preserved during the reordering operation. sendBackward and bringForward only consider
overlapping shapes by default — pass { considerAllShapes: true } to reorder relative to all
shapes on the page instead.

[3]
Create three overlapping shapes so the z-order changes are immediately visible. Each shape is
offset slightly so they stack visually.
*/
