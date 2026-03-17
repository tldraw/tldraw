import { createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('Sets shape meta by default to an empty object', () => {
	const id = createShapeId()
	editor.createShapes([{ id, type: 'geo' }]).select(id)
	expect(editor.getOnlySelectedShape()!.meta).toStrictEqual({})
})

it('Sets shape meta', () => {
	editor.getInitialMetaForShape = (shape) => ({ firstThreeCharactersOfId: shape.id.slice(0, 3) })
	const id = createShapeId()
	editor.createShapes([{ id, type: 'geo' }]).select(id)
	expect(editor.getOnlySelectedShape()!.meta).toStrictEqual({ firstThreeCharactersOfId: 'sha' })
})
