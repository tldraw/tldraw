import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CANVAS_OPS_BATCH_JSON_SCHEMA } from '@tldraw/dotcom-shared'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ImageOpSchema, OpsBatchSchema, ResolvedImageOpSchema } from './schema'

// Vitest runs from the client workspace.
const COPY_PATH = resolve(
	process.cwd(),
	'../../../packages/dotcom-shared/src/canvasOpsJsonSchema.ts'
)

// The apply_ops tool definition tells the model what ops exist, from a copy of this schema, because
// the sync worker can't import zod. If they drift, the model is told to send ops the tab refuses.
it('matches the copy of the op schema the MCP tool is advertised with', () => {
	const actual = z.toJSONSchema(OpsBatchSchema, { target: 'draft-7' })
	if (process.env.UPDATE_CANVAS_OPS_SCHEMA) {
		writeFileSync(
			COPY_PATH,
			`// A copy of OpsBatchSchema in apps/dotcom/client/src/tla/utils/canvas-ops/schema.ts, as JSON schema. The
// worker can't import that without bundling zod. canvas-ops/schema.test.ts fails when the two disagree;
// run it with UPDATE_CANVAS_OPS_SCHEMA=1 to rewrite this file, then format it.
export const CANVAS_OPS_BATCH_JSON_SCHEMA = ${JSON.stringify(actual)} as const
`
		)
		return
	}
	expect(
		CANVAS_OPS_BATCH_JSON_SCHEMA,
		'Run this test with UPDATE_CANVAS_OPS_SCHEMA=1 to update the copy'
	).toEqual(actual)
})

describe('ImageOpSchema', () => {
	it('takes an upload or an https url, placed like add', () => {
		const ops = [
			{ op: 'image', source: { uploadId: 'up1' } },
			{
				op: 'image',
				source: { url: 'https://example.com/a.png' },
				id: 'shot',
				w: 320,
				altText: 'A chart',
				relation: 'right_of',
				target: 'shape:box',
				gap: 40,
			},
		]
		for (const op of ops) expect(ImageOpSchema.parse(op)).toEqual(op)
	})

	it('refuses two sources, a non-https url and a height', () => {
		const refused = [
			{ op: 'image', source: { uploadId: 'up1', url: 'https://example.com/a.png' } },
			{ op: 'image', source: { url: 'http://example.com/a.png' } },
			{ op: 'image', source: { url: 'data:image/png;base64,AAAA' } },
			{ op: 'image', source: { uploadId: 'up1' }, h: 200 },
			{ op: 'image' },
		]
		for (const op of refused) expect(ImageOpSchema.safeParse(op).success).toBe(false)
	})

	// The worker resolves the source, so an op that reaches the tab with one a model wrote is refused.
	it('reaches the tab only with a source the worker resolved', () => {
		const resolved = {
			op: 'image',
			source: {
				src: 'https://tldrawusercontent.com/abc-png',
				mimeType: 'image/png',
				name: 'shot.png',
				fileSize: 1234,
			},
		}
		expect(ResolvedImageOpSchema.parse(resolved)).toEqual(resolved)
		const failed = { op: 'image', source: { failed: 'No uploaded image for that uploadId.' } }
		expect(ResolvedImageOpSchema.parse(failed)).toEqual(failed)
		expect(
			ResolvedImageOpSchema.safeParse({ op: 'image', source: { uploadId: 'up1' } }).success
		).toBe(false)
	})

	it('is not advertised yet', () => {
		expect(
			OpsBatchSchema.safeParse({ ops: [{ op: 'image', source: { uploadId: 'up1' } }] }).success
		).toBe(false)
	})
})
