import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CANVAS_OPS_BATCH_JSON_SCHEMA } from '@tldraw/dotcom-shared'
import { expect, it } from 'vitest'
import { z } from 'zod'
import { OpsBatchSchema } from './schema'

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
