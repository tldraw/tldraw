import {
	createShapeId,
	getTldrawMetaFromShapeMeta,
	tldrawShapeMetaKey,
} from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('Sets shape meta by default to an empty object', () => {
	const id = createShapeId()
	editor.createShapes([{ id, type: 'geo' }]).select(id)
	const meta = editor.getOnlySelectedShape()!.meta
	// Shape meta always includes __tldraw attribution; custom meta should be empty
	expect(getTldrawMetaFromShapeMeta(meta).createdBy).toBeDefined()
	const { [tldrawShapeMetaKey]: _, ...rest } = meta
	expect(rest).toStrictEqual({})
})

it('Sets shape meta', () => {
	editor.getInitialMetaForShape = (shape) => ({ firstThreeCharactersOfId: shape.id.slice(0, 3) })
	const id = createShapeId()
	editor.createShapes([{ id, type: 'geo' }]).select(id)
	const meta = editor.getOnlySelectedShape()!.meta
	expect(meta).toMatchObject({ firstThreeCharactersOfId: 'sha' })
	expect(getTldrawMetaFromShapeMeta(meta).createdBy).toBeDefined()
})
