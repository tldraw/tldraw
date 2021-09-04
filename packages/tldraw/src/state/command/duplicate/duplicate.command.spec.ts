/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { ArrowShape, GroupShape, TLDrawShapeType } from '~types'

describe('Duplicate command', () => {
  const tlstate = new TLDrawState()
  tlstate.loadDocument(mockDocument)
  tlstate.select('rect1')

  it('does, undoes and redoes command', () => {
    expect(Object.keys(tlstate.getPage().shapes).length).toBe(3)

    tlstate.duplicate()

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(4)

    tlstate.undo()

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(3)

    tlstate.redo()

    expect(Object.keys(tlstate.getPage().shapes).length).toBe(4)
  })

  describe('when duplicating a shape', () => {
    it.todo('sets the correct props (parent and childIndex)')
  })

  describe('when duplicating a bound shape', () => {
    it('removed the binding when the target is not selected', () => {
      tlstate.resetDocument().createShapes(
        {
          id: 'target1',
          type: TLDrawShapeType.Rectangle,
          point: [0, 0],
          size: [100, 100],
        },
        {
          type: TLDrawShapeType.Arrow,
          id: 'arrow1',
          point: [200, 200],
        }
      )

      const beforeShapeIds = Object.keys(tlstate.page.shapes)

      tlstate
        .select('arrow1')
        .startHandleSession([200, 200], 'start')
        .updateHandleSession([50, 50])
        .completeSession()

      const beforeArrow = tlstate.getShape<ArrowShape>('arrow1')

      expect(beforeArrow.handles.start.bindingId).toBeTruthy()

      tlstate.select('arrow1').duplicate()

      const afterShapeIds = Object.keys(tlstate.page.shapes)

      const newShapeIds = afterShapeIds.filter((id) => !beforeShapeIds.includes(id))

      expect(newShapeIds.length).toBe(1)

      const duplicatedArrow = tlstate.getShape<ArrowShape>(newShapeIds[0])

      expect(duplicatedArrow.handles.start.bindingId).toBeUndefined()
    })

    it('duplicates the binding when the target is selected', () => {
      tlstate.resetDocument().createShapes(
        {
          id: 'target1',
          type: TLDrawShapeType.Rectangle,
          point: [0, 0],
          size: [100, 100],
        },
        {
          type: TLDrawShapeType.Arrow,
          id: 'arrow1',
          point: [200, 200],
        }
      )

      const beforeShapeIds = Object.keys(tlstate.page.shapes)

      tlstate
        .select('arrow1')
        .startHandleSession([200, 200], 'start')
        .updateHandleSession([50, 50])
        .completeSession()

      const oldBindingId = tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId
      expect(oldBindingId).toBeTruthy()

      tlstate.select('arrow1', 'target1').duplicate()

      const afterShapeIds = Object.keys(tlstate.page.shapes)

      const newShapeIds = afterShapeIds.filter((id) => !beforeShapeIds.includes(id))

      expect(newShapeIds.length).toBe(2)

      const newBindingId = tlstate.getShape<ArrowShape>(newShapeIds[0]).handles.start.bindingId

      expect(newBindingId).toBeTruthy()

      tlstate.undo()

      expect(tlstate.getBinding(newBindingId!)).toBeUndefined()
      expect(tlstate.getShape<ArrowShape>(newShapeIds[0])).toBeUndefined()

      tlstate.redo()

      expect(tlstate.getBinding(newBindingId!)).toBeTruthy()
      expect(tlstate.getShape<ArrowShape>(newShapeIds[0]).handles.start.bindingId).toBe(
        newBindingId
      )
    })

    it('duplicates groups', () => {
      tlstate.loadDocument(mockDocument)
      tlstate.group(['rect1', 'rect2'], 'newGroup').select('newGroup')

      const beforeShapeIds = Object.keys(tlstate.page.shapes)

      tlstate.duplicate()

      expect(Object.keys(tlstate.page.shapes).length).toBe(beforeShapeIds.length + 3)

      tlstate.undo()

      expect(Object.keys(tlstate.page.shapes).length).toBe(beforeShapeIds.length)

      tlstate.redo()

      expect(Object.keys(tlstate.page.shapes).length).toBe(beforeShapeIds.length + 3)
    })

    it('duplicates grouped shapes', () => {
      tlstate.loadDocument(mockDocument)
      tlstate.group(['rect1', 'rect2'], 'newGroup').select('rect1')

      const beforeShapeIds = Object.keys(tlstate.page.shapes)

      tlstate.duplicate()

      expect(Object.keys(tlstate.page.shapes).length).toBe(beforeShapeIds.length + 1)

      tlstate.undo()

      expect(Object.keys(tlstate.page.shapes).length).toBe(beforeShapeIds.length)

      tlstate.redo()

      expect(Object.keys(tlstate.page.shapes).length).toBe(beforeShapeIds.length + 1)
    })
  })

  it.todo('Does not delete uneffected bindings.')
})
