/**
 * Test script for the thumbnail generator.
 *
 * Usage:
 *   1. Start the viewer:  yarn dev:viewer
 *   2. Start the server:  yarn dev:server
 *   3. Run this script:   yarn test:snapshot
 *
 * This creates a sample tldraw snapshot with various shapes, sends it to the
 * thumbnail server, and saves the resulting PNG to ./test-output.png
 */
import { writeFileSync } from 'fs'
import type { TLGeoShape, TLTextShape } from 'tldraw'
import { createTLStore, defaultBindingUtils, defaultShapeUtils, getSnapshot } from 'tldraw'

async function main() {
	const serverUrl = process.env.SERVER_URL ?? 'http://localhost:5422'

	console.log('Creating sample tldraw snapshot...')

	// Create a store with default shape utils (works in Node)
	const store = createTLStore({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
	})

	// Initialize default records (document, page, camera, etc.)
	store.ensureStoreIsUsable()

	// Get the default page ID
	const pages = store.allRecords().filter((r) => r.typeName === 'page')
	const pageId = pages[0].id

	// Add some shapes to the store
	store.put([
		// A blue rectangle
		{
			id: 'shape:rect1' as TLGeoShape['id'],
			typeName: 'shape',
			type: 'geo',
			x: 100,
			y: 100,
			rotation: 0,
			index: 'a1' as any,
			parentId: pageId,
			isLocked: false,
			opacity: 1,
			props: {
				geo: 'rectangle',
				w: 300,
				h: 200,
				color: 'blue',
				fill: 'solid',
				dash: 'draw',
				size: 'm',
				font: 'draw',
				align: 'middle',
				verticalAlign: 'middle',
				richText: { type: 'doc', content: [{ type: 'paragraph' }] },
				labelColor: 'black',
				url: '',
				growY: 0,
				scale: 1,
			},
			meta: {},
		} as any,

		// A red ellipse
		{
			id: 'shape:ellipse1' as TLGeoShape['id'],
			typeName: 'shape',
			type: 'geo',
			x: 500,
			y: 150,
			rotation: 0,
			index: 'a2' as any,
			parentId: pageId,
			isLocked: false,
			opacity: 1,
			props: {
				geo: 'ellipse',
				w: 250,
				h: 250,
				color: 'red',
				fill: 'solid',
				dash: 'draw',
				size: 'm',
				font: 'draw',
				align: 'middle',
				verticalAlign: 'middle',
				richText: { type: 'doc', content: [{ type: 'paragraph' }] },
				labelColor: 'black',
				url: '',
				growY: 0,
				scale: 1,
			},
			meta: {},
		} as any,

		// A green diamond
		{
			id: 'shape:diamond1' as TLGeoShape['id'],
			typeName: 'shape',
			type: 'geo',
			x: 300,
			y: 400,
			rotation: 0,
			index: 'a3' as any,
			parentId: pageId,
			isLocked: false,
			opacity: 1,
			props: {
				geo: 'diamond',
				w: 200,
				h: 200,
				color: 'green',
				fill: 'solid',
				dash: 'draw',
				size: 'm',
				font: 'draw',
				align: 'middle',
				verticalAlign: 'middle',
				richText: { type: 'doc', content: [{ type: 'paragraph' }] },
				labelColor: 'black',
				url: '',
				growY: 0,
				scale: 1,
			},
			meta: {},
		} as any,

		// A text shape
		{
			id: 'shape:text1' as TLTextShape['id'],
			typeName: 'shape',
			type: 'text',
			x: 150,
			y: 50,
			rotation: 0,
			index: 'a4' as any,
			parentId: pageId,
			isLocked: false,
			opacity: 1,
			props: {
				color: 'black',
				size: 'xl',
				font: 'sans',
				textAlign: 'start',
				w: 500,
				richText: {
					type: 'doc',
					content: [
						{
							type: 'paragraph',
							content: [{ type: 'text', text: 'tldraw thumbnail test' }],
						},
					],
				},
				scale: 1,
				autoSize: false,
			},
			meta: {},
		} as any,
	])

	// Export the snapshot
	const snapshot = getSnapshot(store)
	console.log(`Snapshot created with ${Object.keys(snapshot.document.store).length} records`)

	// Send to the thumbnail server
	console.log(`Sending to ${serverUrl}/api/thumbnail...`)

	const response = await fetch(`${serverUrl}/api/thumbnail`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			snapshot,
			width: 1200,
			height: 630,
			scale: 2,
		}),
	})

	if (!response.ok) {
		const error = await response.text()
		console.error(`Server error (${response.status}): ${error}`)
		process.exit(1)
	}

	const buffer = Buffer.from(await response.arrayBuffer())
	const outputPath = new URL('./test-output.png', import.meta.url).pathname
	writeFileSync(outputPath, buffer)

	const generationTime = response.headers.get('X-Generation-Time')
	console.log(`Thumbnail saved to ${outputPath}`)
	console.log(`Image size: ${buffer.length} bytes`)
	console.log(`Generation time: ${generationTime}`)
}

main().catch((err) => {
	console.error('Error:', err)
	process.exit(1)
})
