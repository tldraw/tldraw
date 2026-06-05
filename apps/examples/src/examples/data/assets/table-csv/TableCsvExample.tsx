import { useState } from 'react'
import {
	Editor,
	TLTableShape,
	Tldraw,
	createShapeId,
	deleteColumn,
	deleteRow,
	getTableData,
	insertColumn,
	insertRow,
	setCellText,
} from 'tldraw'
import 'tldraw/tldraw.css'

// Export and import a table as CSV. The SDK provides the data accessors —
// `getTableData` (table → 2D array) and `setCellText` — and leaves the actual CSV
// serialization to the consumer. This file is that reference implementation.

export default function TableCsvExample() {
	const [editor, setEditor] = useState<Editor | null>(null)
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(ed) => {
					setEditor(ed)
					if (ed.getCurrentPageShapeIds().size === 0) seedTable(ed)
				}}
			/>
			{editor && <CsvControls editor={editor} />}
		</div>
	)
}

function CsvControls({ editor }: { editor: Editor }) {
	const getTable = () =>
		editor.getCurrentPageShapes().find((s) => s.type === 'table') as TLTableShape

	function exportCsv() {
		const table = getTable()
		if (!table) return
		const csv = getTableData(editor, table.id)
			.map((row) => row.map(csvEscapeField).join(','))
			.join('\n')
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
		const a = document.createElement('a')
		a.href = url
		a.download = 'table.csv'
		a.click()
		URL.revokeObjectURL(url)
	}

	function importCsv(file: File) {
		const reader = new FileReader()
		reader.onload = () => {
			const rows = parseCsv(String(reader.result))
			if (!rows.length || !getTable()) return
			const neededCols = Math.max(...rows.map((r) => r.length), 1)

			editor.run(() => {
				let table = getTable()
				// resize the table to exactly fit the imported data (a table keeps >= 1 row/col)
				while ((table = getTable()).props.cols.length < neededCols)
					insertColumn(editor, table, table.props.cols.length)
				while ((table = getTable()).props.cols.length > neededCols)
					deleteColumn(editor, table, table.props.cols.length - 1)
				while ((table = getTable()).props.rows.length < rows.length)
					insertRow(editor, table, table.props.rows.length)
				while ((table = getTable()).props.rows.length > rows.length)
					deleteRow(editor, table, table.props.rows.length - 1)
				// write every cell, filling blanks so any previous content is cleared
				table = getTable()
				for (let r = 0; r < rows.length; r++) {
					for (let c = 0; c < neededCols; c++) {
						setCellText(editor, table.id, r, c, rows[r][c] ?? '')
					}
				}
			})

			// bring the freshly imported table into view
			const table = getTable()
			if (table) {
				editor.select(table.id)
				editor.zoomToFit()
			}
		}
		reader.readAsText(file)
	}

	return (
		<div
			style={{
				position: 'absolute',
				top: 8,
				left: '50%',
				transform: 'translateX(-50%)',
				zIndex: 300,
				display: 'flex',
				gap: 8,
				pointerEvents: 'all',
			}}
		>
			<button onClick={exportCsv}>Export CSV</button>
			<label
				style={{ cursor: 'pointer', border: '1px solid #ccc', borderRadius: 4, padding: '2px 8px' }}
			>
				Import CSV
				<input
					type="file"
					accept=".csv,text/csv"
					style={{ display: 'none' }}
					onChange={(e) => {
						const file = e.target.files?.[0]
						e.target.value = '' // reset so the same file can be re-imported
						if (file) importCsv(file)
					}}
				/>
			</label>
		</div>
	)
}

// --- Minimal CSV helpers (a consumer would use a real CSV library) ---
function csvEscapeField(value: string): string {
	return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}
function parseCsv(text: string): string[][] {
	return text
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.filter((line, i, all) => line !== '' || i < all.length - 1)
		.map((line) => line.split(',').map((f) => f.replace(/^"|"$/g, '').replace(/""/g, '"')))
}

function seedTable(editor: Editor) {
	const id = createShapeId()
	editor.createShape({ id, type: 'table', x: 150, y: 150, props: { headerRows: 1 } })
	const data = [
		['Name', 'Role', 'Location'],
		['Ada', 'Engineer', 'London'],
		['Grace', 'Admiral', 'New York'],
	]
	data.forEach((row, r) => row.forEach((text, c) => setCellText(editor, id, r, c, text)))
	editor.zoomToFit()
}
