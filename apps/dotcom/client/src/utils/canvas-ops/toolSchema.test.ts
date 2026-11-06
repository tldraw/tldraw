import { CANVAS_OPS_BATCH_JSON_SCHEMA } from '@tldraw/dotcom-shared'
import { expect, it } from 'vitest'
import { z } from 'zod'
import { OpsBatchSchema } from './schema'

// The apply_ops tool definition tells the model what ops exist, from a copy of this schema, because
// the sync worker can't import zod. If they drift, the model is told to send ops the tab refuses.
it('matches the copy of the op schema the MCP tool is advertised with', () => {
	const actual = z.toJSONSchema(OpsBatchSchema, { target: 'draft-7' })
	expect(
		CANVAS_OPS_BATCH_JSON_SCHEMA,
		'Paste this into packages/dotcom-shared/src/canvasOpsJsonSchema.ts'
	).toEqual(actual)
})

// tldraw.com's CSP forbids eval, so a compiled validator throws in the tab rather than validating.
// Nothing fails in a test without a CSP, which is why this is pinned rather than left to the behavior.
it('validates ops without compiling code', () => {
	expect(z.config().jitless).toBe(true)
})
