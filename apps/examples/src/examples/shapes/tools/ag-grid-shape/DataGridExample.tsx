/* eslint-disable react-hooks/rules-of-hooks */
import { AgGridReact } from 'ag-grid-react'
import { BaseBoxShapeUtil, TLShape, Tldraw, createShapeId, useDelaySvgExport } from 'tldraw'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import 'tldraw/tldraw.css'

const AG_GRID_TYPE = 'ag-grid'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[AG_GRID_TYPE]: { w: number; h: number; rowData: any[]; columnDefs: any[] }
	}
}

type AgGridShape = TLShape<typeof AG_GRID_TYPE>

class AgGridShapeUtil extends BaseBoxShapeUtil<AgGridShape> {
	static override type = AG_GRID_TYPE

	// [1]
	override canScroll(): boolean {
		return true
	}

	override canEdit(): boolean {
		return true
	}

	override getDefaultProps() {
		return {
			w: 300,
			h: 200,
			rowData: [],
			columnDefs: [],
		}
	}

	override component(shape: AgGridShape) {
		// [2]
		const isEditing = this.editor.getEditingShapeId() === shape.id
		// [3]
		const isReady = useDelaySvgExport()

		return (
			<div
				style={{
					width: shape.props.w,
					height: shape.props.h,
					pointerEvents: isEditing ? 'all' : undefined,
				}}
				className="ag-theme-quartz"
			>
				<AgGridReact
					onGridReady={isReady}
					rowData={shape.props.rowData}
					columnDefs={shape.props.columnDefs}
				/>
			</div>
		)
	}

	override getIndicatorPath(shape: AgGridShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

const shapeUtils = [AgGridShapeUtil]

export default function DataGridExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="ag-grid-example"
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					// [4]
					const agGridShapeId = createShapeId('ag-grid')

					if (!editor.getShape(agGridShapeId)) {
						editor.createShape({
							id: agGridShapeId,
							type: AG_GRID_TYPE,
							props: {
								w: 400,
								h: 300,
								rowData: [
									{ make: 'Tesla', model: 'Model Y', price: 64950, electric: true },
									{ make: 'Ford', model: 'F-Series', price: 33850, electric: false },
									{ make: 'Toyota', model: 'Corolla', price: 29600, electric: false },
								],
								columnDefs: [
									{ field: 'make', filter: true, floatingFilter: true, flex: 1 },
									{ field: 'model', flex: 1 },
									{ field: 'price', filter: true, floatingFilter: true, flex: 1 },
									{ field: 'electric', flex: 1 },
								],
							},
						})
						editor.select(agGridShapeId)
						editor.zoomToSelection()
					}
				}}
			/>
		</div>
	)
}

/*
[1]
`canEdit` lets the shape enter the editing state on double-click, which is when we turn on
pointer events so the grid's filters and sorting are usable. While the shape is being edited,
`canScroll` lets wheel events reach the grid so it scrolls its own rows instead of panning
the canvas.

[2]
Reading `getEditingShapeId()` in the component re-renders the shape when editing starts or stops.

[3]
AG Grid renders its rows asynchronously. `useDelaySvgExport` returns a callback that
holds up SVG/image export until it's called, so we wire it to `onGridReady` and exports
don't capture an empty grid.

[4]
The example uses a `persistenceKey`, so the shape survives reloads. Using a fixed id
lets us skip creating a second grid when one already exists.
*/
