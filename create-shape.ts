// TLDR_API_TOKEN=... TLDR_FILE_SLUG=... npx tsx create-shape.ts
import { createShapeId } from '@tldraw/tlschema'

const BASE = process.env.TLDR_API_BASE ?? 'http://localhost:8787'
const TOKEN = required('TLDR_API_TOKEN')
const SLUG = required('TLDR_FILE_SLUG')

function required(name: string): string {
	const v = process.env[name]
	if (!v) throw new Error(`Missing env var ${name}`)
	return v
}

const shape = {
	id: createShapeId(),
	typeName: 'shape',
	type: 'geo',
	x: 100 + Math.random() * 400,
	y: 100 + Math.random() * 400,
	rotation: 0,
	index: 'a1',
	parentId: 'page:page',
	isLocked: false,
	opacity: 1,
	meta: {},
	props: {
		geo: 'rectangle',
		w: 200,
		h: 100,
		color: 'red',
		fill: 'solid',
		dash: 'draw',
		size: 'm',
		font: 'draw',
		align: 'middle',
		verticalAlign: 'middle',
		labelColor: 'black',
		url: '',
		growY: 0,
		scale: 1,
		richText: { type: 'doc', content: [{ type: 'paragraph' }] },
	},
}

;(async () => {
	const res = await fetch(`${BASE}/api/app/file/${SLUG}/whiteboard-rpc`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${TOKEN}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			operations: [{ command: 'createShape', params: { shape } }],
		}),
	})
	// eslint-disable-next-line no-console
	console.log(res.status, await res.text())
})()
