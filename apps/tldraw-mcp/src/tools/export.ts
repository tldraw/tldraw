/** export tool — exports diagram as tldraw-compatible JSON. */

import { getAllBindings, getAllShapes, getTitle } from '../store.js'

function generateUUID(): string {
	if (globalThis.crypto?.randomUUID) {
		return globalThis.crypto.randomUUID()
	}
	// Fallback: simple v4-like UUID using Math.random
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0
		const v = c === 'x' ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})
}

interface TldrDocument {
	tldrawFileFormatVersion: number
	schema: {
		schemaVersion: number
		sequences: Record<string, number>
	}
	records: unknown[]
}

function buildPageRecord() {
	return {
		typeName: 'page',
		id: 'page:page',
		name: 'Page 1',
		index: 'a1',
		meta: {},
	}
}

function buildBindingRecords(
	bindings: { arrowShapeId: string; targetShapeId: string; terminal: string }[]
): unknown[] {
	return bindings.map((b) => ({
		typeName: 'binding',
		id: `binding:${generateUUID().slice(0, 8)}`,
		type: 'arrow',
		fromId: b.arrowShapeId,
		toId: b.targetShapeId,
		props: {
			normalizedAnchor: { x: 0.5, y: 0.5 },
			isExact: false,
			isPrecise: false,
			terminal: b.terminal,
		},
		meta: {},
	}))
}

function buildTldrDocument(shapes: unknown[], bindings: unknown[]): TldrDocument {
	return {
		tldrawFileFormatVersion: 1,
		schema: {
			schemaVersion: 2,
			sequences: {
				'com.tldraw.store': 4,
				'com.tldraw.asset': 1,
				'com.tldraw.camera': 1,
				'com.tldraw.document': 2,
				'com.tldraw.instance': 25,
				'com.tldraw.instance_page_state': 5,
				'com.tldraw.page': 1,
				'com.tldraw.shape': 4,
				'com.tldraw.instance_presence': 5,
				'com.tldraw.pointer': 1,
			},
		},
		records: [buildPageRecord(), ...shapes, ...bindings],
	}
}

export interface ExportResult {
	format: string
	data: unknown
	shapeCount: number
}

export function executeExport(format: 'json' | 'tldr' = 'json'): ExportResult {
	const shapes = getAllShapes()
	const bindings = getAllBindings()
	const title = getTitle()

	if (format === 'tldr') {
		const bindingRecords = buildBindingRecords(bindings)
		return {
			format: 'tldr',
			data: buildTldrDocument(shapes, bindingRecords),
			shapeCount: shapes.length,
		}
	}

	return {
		format: 'json',
		data: { shapes, bindings, title },
		shapeCount: shapes.length,
	}
}
