/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Utils } from '@tldraw/core'
import { TLDrawState } from '~state'
import { TLDR } from '~state/TLDR'
import { mockDocument } from '~test'
import { ArrowShape, SessionType, TLDrawShapeType } from '~types'

describe('Duplicate command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = tlstate.state
      tlstate.duplicate()
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    tlstate.select('rect1')

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
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([50, 50])
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
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([50, 50])
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

describe('when point-duplicating', () => {
  it('duplicates without crashing', () => {
    const tlstate = new TLDrawState()

    tlstate
      .loadDocument(mockDocument)
      .group(['rect1', 'rect2'])
      .selectAll()
      .duplicate(tlstate.selectedIds, [200, 200])
  })

  it('duplicates in the correct place', () => {
    const tlstate = new TLDrawState()

    tlstate.loadDocument(mockDocument).group(['rect1', 'rect2']).selectAll()

    const before = tlstate.shapes.map((shape) => shape.id)

    tlstate.duplicate(tlstate.selectedIds, [200, 200])

    const after = tlstate.shapes.filter((shape) => !before.includes(shape.id))

    expect(
      Utils.getBoundsCenter(Utils.getCommonBounds(after.map((shape) => TLDR.getBounds(shape))))
    ).toStrictEqual([200, 200])
  })
})
