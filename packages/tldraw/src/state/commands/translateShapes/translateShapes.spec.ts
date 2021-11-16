/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { mockDocument, TldrawTestApp } from '~test'
import { ArrowShape, SessionType, TDShapeType } from '~types'

describe('Translate command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = app.state
      app.nudge([1, 2])
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    app.selectAll()
    app.nudge([1, 2])

    expect(app.getShape('rect2').point).toEqual([101, 102])

    app.undo()

    expect(app.getShape('rect2').point).toEqual([100, 100])

    app.redo()

    expect(app.getShape('rect2').point).toEqual([101, 102])
  })

  it('major nudges', () => {
    app.selectAll()
    app.nudge([1, 2], true)
    expect(app.getShape('rect2').point).toEqual([110, 120])
  })

  describe('when nudging shapes with bindings', () => {
    it('deleted bindings if nudging shape is bound to other shapes', () => {
      app
        .resetDocument()
        .createShapes(
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
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
        .completeSession()

      const bindingId = app.getShape<ArrowShape>('arrow1').handles.start.bindingId!

      app.select('arrow1').nudge([10, 10])

      expect(app.getBinding(bindingId)).toBeUndefined()
      expect(app.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBeUndefined()

      app.undo()

      expect(app.getBinding(bindingId)).toBeDefined()
      expect(app.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      app.redo()

      expect(app.getBinding(bindingId)).toBeUndefined()
      expect(app.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBeUndefined()
    })

    it('does not delete bindings if both bound and bound-to shapes are nudged', () => {
      app
        .resetDocument()
        .createShapes(
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
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
        .completeSession()

      const bindingId = app.getShape<ArrowShape>('arrow1').handles.start.bindingId!

      app.select('arrow1', 'target1').nudge([10, 10])

      expect(app.getBinding(bindingId)).toBeDefined()
      expect(app.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      app.undo()

      expect(app.getBinding(bindingId)).toBeDefined()
      expect(app.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      app.redo()

      expect(app.getBinding(bindingId)).toBeDefined()
      expect(app.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)
    })
  })
})

describe('When nudging groups', () => {
  it('nudges children instead', () => {
    new TldrawTestApp()
      .loadDocument(mockDocument)
      .group(['rect1', 'rect2'], 'groupA')
      .nudge([1, 1])
      .expectShapesToBeAtPoints({
        rect1: [1, 1],
        rect2: [101, 101],
      })
  })
})
