/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Utils } from '@tldraw/core'
import { TLDR } from '~state/TLDR'
import { mockDocument, TldrawTestApp } from '~test'
import { ArrowShape, SessionType, TldrawShapeType } from '~types'

describe('Duplicate command', () => {
  const state = new TldrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = state.state
      state.duplicate()
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    state.select('rect1')

    expect(Object.keys(state.getPage().shapes).length).toBe(3)

    state.duplicate()

    expect(Object.keys(state.getPage().shapes).length).toBe(4)

    state.undo()

    expect(Object.keys(state.getPage().shapes).length).toBe(3)

    state.redo()

    expect(Object.keys(state.getPage().shapes).length).toBe(4)
  })

  describe('when duplicating a shape', () => {
    it.todo('sets the correct props (parent and childIndex)')
  })

  describe('when duplicating a bound shape', () => {
    it('removed the binding when the target is not selected', () => {
      state.resetDocument().createShapes(
        {
          id: 'target1',
          type: TldrawShapeType.Rectangle,
          point: [0, 0],
          size: [100, 100],
        },
        {
          type: TldrawShapeType.Arrow,
          id: 'arrow1',
          point: [200, 200],
        }
      )

      const beforeShapeIds = Object.keys(state.page.shapes)

      state
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
        .completeSession()

      const beforeArrow = state.getShape<ArrowShape>('arrow1')

      expect(beforeArrow.handles.start.bindingId).toBeTruthy()

      state.select('arrow1').duplicate()

      const afterShapeIds = Object.keys(state.page.shapes)

      const newShapeIds = afterShapeIds.filter((id) => !beforeShapeIds.includes(id))

      expect(newShapeIds.length).toBe(1)

      const duplicatedArrow = state.getShape<ArrowShape>(newShapeIds[0])

      expect(duplicatedArrow.handles.start.bindingId).toBeUndefined()
    })

    it('duplicates the binding when the target is selected', () => {
      state.resetDocument().createShapes(
        {
          id: 'target1',
          type: TldrawShapeType.Rectangle,
          point: [0, 0],
          size: [100, 100],
        },
        {
          type: TldrawShapeType.Arrow,
          id: 'arrow1',
          point: [200, 200],
        }
      )

      const beforeShapeIds = Object.keys(state.page.shapes)

      state
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
        .completeSession()

      const oldBindingId = state.getShape<ArrowShape>('arrow1').handles.start.bindingId
      expect(oldBindingId).toBeTruthy()

      state.select('arrow1', 'target1').duplicate()

      const afterShapeIds = Object.keys(state.page.shapes)

      const newShapeIds = afterShapeIds.filter((id) => !beforeShapeIds.includes(id))

      expect(newShapeIds.length).toBe(2)

      const newBindingId = state.getShape<ArrowShape>(newShapeIds[0]).handles.start.bindingId

      expect(newBindingId).toBeTruthy()

      state.undo()

      expect(state.getBinding(newBindingId!)).toBeUndefined()
      expect(state.getShape<ArrowShape>(newShapeIds[0])).toBeUndefined()

      state.redo()

      expect(state.getBinding(newBindingId!)).toBeTruthy()
      expect(state.getShape<ArrowShape>(newShapeIds[0]).handles.start.bindingId).toBe(newBindingId)
    })

    it('duplicates groups', () => {
      state.group(['rect1', 'rect2'], 'newGroup').select('newGroup')

      const beforeShapeIds = Object.keys(state.page.shapes)

      state.duplicate()

      expect(Object.keys(state.page.shapes).length).toBe(beforeShapeIds.length + 3)

      state.undo()

      expect(Object.keys(state.page.shapes).length).toBe(beforeShapeIds.length)

      state.redo()

      expect(Object.keys(state.page.shapes).length).toBe(beforeShapeIds.length + 3)
    })

    it('duplicates grouped shapes', () => {
      state.group(['rect1', 'rect2'], 'newGroup').select('rect1')

      const beforeShapeIds = Object.keys(state.page.shapes)

      state.duplicate()

      expect(Object.keys(state.page.shapes).length).toBe(beforeShapeIds.length + 1)

      state.undo()

      expect(Object.keys(state.page.shapes).length).toBe(beforeShapeIds.length)

      state.redo()

      expect(Object.keys(state.page.shapes).length).toBe(beforeShapeIds.length + 1)
    })
  })

  it.todo('Does not delete uneffected bindings.')
})

describe('when point-duplicating', () => {
  it('duplicates without crashing', () => {
    const state = new TldrawTestApp()

    state
      .loadDocument(mockDocument)
      .group(['rect1', 'rect2'])
      .selectAll()
      .duplicate(state.selectedIds, [200, 200])
  })

  it('duplicates in the correct place', () => {
    const state = new TldrawTestApp()

    state.loadDocument(mockDocument).group(['rect1', 'rect2']).selectAll()

    const before = state.shapes.map((shape) => shape.id)

    state.duplicate(state.selectedIds, [200, 200])

    const after = state.shapes.filter((shape) => !before.includes(shape.id))

    expect(
      Utils.getBoundsCenter(Utils.getCommonBounds(after.map((shape) => TLDR.getBounds(shape))))
    ).toStrictEqual([200, 200])
  })
})
