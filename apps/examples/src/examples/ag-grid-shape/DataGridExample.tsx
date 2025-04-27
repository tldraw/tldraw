/* eslint-disable react-hooks/rules-of-hooks */
import { AgGridReact } from 'ag-grid-react'
import { BaseBoxShapeUtil, TLBaseShape, Tldraw, createShapeId, useDelaySvgExport } from 'tldraw'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import 'tldraw/tldraw.css'

type AgGridShape = TLBaseShape<
	'ag-grid',
	{ w: number; h: number; rowData: any[]; columnDefs: any[] }
>
class AgGridShapeUtil extends BaseBoxShapeUtil<AgGridShape> {
	static override type = 'ag-grid'

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
		const isEditing = this.editor.getEditingShapeId() === shape.id
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
					// autoSizeStrategy={{ type: 'f', width: shape.props.w }}
				/>
			</div>
		)
	}
	override indicator(shape: AgGridShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
	}
}

export default function DataGridExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="ag-grid-example"
				shapeUtils={[AgGridShapeUtil]}
				onMount={(editor) => {
					const agGridShapeId = createShapeId('ag-grid')

					if (!editor.getShape(agGridShapeId)) {
						editor.createShape<AgGridShape>({
							id: agGridShapeId,
							type: 'ag-grid',
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
