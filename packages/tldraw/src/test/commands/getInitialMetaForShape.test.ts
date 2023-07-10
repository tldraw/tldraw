import { createShapeId } from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('Sets shape meta by default to an empty object', () => {
	editor.createShapes([{ id: createShapeId(), type: 'geo' }], true)
	expect(editor.onlySelectedShape!.meta).toStrictEqual({})
})

it('Sets shape meta', () => {
	editor.getInitialMetaForShape = (shape) => ({ firstThreeCharactersOfId: shape.id.slice(0, 3) })
	editor.createShapes([{ id: createShapeId(), type: 'geo' }], true)
	expect(editor.onlySelectedShape!.meta).toStrictEqual({ firstThreeCharactersOfId: 'sha' })
})
