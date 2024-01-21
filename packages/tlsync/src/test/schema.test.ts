import { coreShapes, defaultShapeUtils } from '@tldraw/tldraw'
import { schema } from '../lib/schema'

describe('schema', () => {
	test('shape types match core+default shapes', () => {
		const shapeTypes = Object.keys(schema.types.shape.migrations.subTypeMigrations!)
		expect(shapeTypes).toEqual([...coreShapes, ...defaultShapeUtils].map((s) => s.type))
	})
})
