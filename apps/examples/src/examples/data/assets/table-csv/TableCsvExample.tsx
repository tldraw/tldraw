import { useState } from 'react'
import {
	Editor,
	TLTableShape,
	Tldraw,
	createShapeId,
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
			let table = getTable()
			if (!table) return
			const neededCols = Math.max(...rows.map((r) => r.length), 1)
			// grow the table to fit the imported data
			editor.run(() => {
				while ((table = getTable()).props.cols.length < neededCols) {
					insertColumn(editor, table, table.props.cols.length)
				}
				while ((table = getTable()).props.rows.length < rows.length) {
					insertRow(editor, table, table.props.rows.length)
				}
				rows.forEach((row, r) =>
					row.forEach((value, c) => setCellText(editor, table.id, r, c, value))
				)
			})
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
					onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
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
