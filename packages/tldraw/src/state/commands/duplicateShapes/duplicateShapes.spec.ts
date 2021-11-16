/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Utils } from '@tldraw/core'
import { TLDR } from '~state/TLDR'
import { mockDocument, TldrawTestApp } from '~test'
import { ArrowShape, SessionType, TDShapeType } from '~types'

describe('Duplicate command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = app.state
      app.duplicate()
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    app.select('rect1')

    expect(Object.keys(app.getPage().shapes).length).toBe(3)

    app.duplicate()

    expect(Object.keys(app.getPage().shapes).length).toBe(4)

    app.undo()

    expect(Object.keys(app.getPage().shapes).length).toBe(3)

    app.redo()

    expect(Object.keys(app.getPage().shapes).length).toBe(4)
  })

  describe('when duplicating a shape', () => {
    it.todo('sets the correct props (parent and childIndex)')
  })

  describe('when duplicating a bound shape', () => {
    it('removed the binding when the target is not selected', () => {
      app.resetDocument().createShapes(
        {
          id: 'target1',
          type: TDShapeType.Rectangle,
          point: [0, 0],
          size: [100, 100],
        },
        {
          type: TDShapeType.Arrow,
          id: 'arrow1',
          point: [200, 200],
        }
      )

      const beforeShapeIds = Object.keys(app.page.shapes)

      app
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
        .completeSession()

      const beforeArrow = app.getShape<ArrowShape>('arrow1')

      expect(beforeArrow.handles.start.bindingId).toBeTruthy()

      app.select('arrow1').duplicate()

      const afterShapeIds = Object.keys(app.page.shapes)

      const newShapeIds = afterShapeIds.filter((id) => !beforeShapeIds.includes(id))

      expect(newShapeIds.length).toBe(1)

      const duplicatedArrow = app.getShape<ArrowShape>(newShapeIds[0])

      expect(duplicatedArrow.handles.start.bindingId).toBeUndefined()
    })

    it('duplicates the binding when the target is selected', () => {
      app.resetDocument().createShapes(
        {
          id: 'target1',
          type: TDShapeType.Rectangle,
          point: [0, 0],
          size: [100, 100],
        },
        {
          type: TDShapeType.Arrow,
          id: 'arrow1',
          point: [200, 200],
        }
      )

      const beforeShapeIds = Object.keys(app.page.shapes)

      app
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
        .completeSession()

      const oldBindingId = app.getShape<ArrowShape>('arrow1').handles.start.bindingId
      expect(oldBindingId).toBeTruthy()

      app.select('arrow1', 'target1').duplicate()

      const afterShapeIds = Object.keys(app.page.shapes)

      const newShapeIds = afterShapeIds.filter((id) => !beforeShapeIds.includes(id))

      expect(newShapeIds.length).toBe(2)

      const newBindingId = app.getShape<ArrowShape>(newShapeIds[0]).handles.start.bindingId

      expect(newBindingId).toBeTruthy()

      app.undo()

      expect(app.getBinding(newBindingId!)).toBeUndefined()
      expect(app.getShape<ArrowShape>(newShapeIds[0])).toBeUndefined()

      app.redo()

      expect(app.getBinding(newBindingId!)).toBeTruthy()
      expect(app.getShape<ArrowShape>(newShapeIds[0]).handles.start.bindingId).toBe(newBindingId)
    })

    it('duplicates groups', () => {
      app.group(['rect1', 'rect2'], 'newGroup').select('newGroup')

      const beforeShapeIds = Object.keys(app.page.shapes)

      app.duplicate()

      expect(Object.keys(app.page.shapes).length).toBe(beforeShapeIds.length + 3)

      app.undo()

      expect(Object.keys(app.page.shapes).length).toBe(beforeShapeIds.length)

      app.redo()

      expect(Object.keys(app.page.shapes).length).toBe(beforeShapeIds.length + 3)
    })

    it('duplicates grouped shapes', () => {
      app.group(['rect1', 'rect2'], 'newGroup').select('rect1')

      const beforeShapeIds = Object.keys(app.page.shapes)

      app.duplicate()

      expect(Object.keys(app.page.shapes).length).toBe(beforeShapeIds.length + 1)

      app.undo()

      expect(Object.keys(app.page.shapes).length).toBe(beforeShapeIds.length)

      app.redo()

      expect(Object.keys(app.page.shapes).length).toBe(beforeShapeIds.length + 1)
    })
  })

  it.todo('Does not delete uneffected bindings.')
})

describe('when point-duplicating', () => {
  it('duplicates without crashing', () => {
    const app = new TldrawTestApp()

    app
      .loadDocument(mockDocument)
      .group(['rect1', 'rect2'])
      .selectAll()
      .duplicate(app.selectedIds, [200, 200])
  })

  it('duplicates in the correct place', () => {
    const app = new TldrawTestApp()

    app.loadDocument(mockDocument).group(['rect1', 'rect2']).selectAll()

    const before = app.shapes.map((shape) => shape.id)

    app.duplicate(app.selectedIds, [200, 200])

    const after = app.shapes.filter((shape) => !before.includes(shape.id))

    expect(
      Utils.getBoundsCenter(Utils.getCommonBounds(after.map((shape) => TLDR.getBounds(shape))))
    ).toStrictEqual([200, 200])
  })
})
