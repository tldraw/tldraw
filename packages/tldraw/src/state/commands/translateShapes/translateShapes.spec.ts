/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLDrawState } from '~state'
import { mockDocument, TLDrawStateUtils } from '~test'
import { ArrowShape, SessionType, TLDrawShapeType } from '~types'

describe('Translate command', () => {
  const state = new TLDrawState()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = state.state
      state.nudge([1, 2])
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    state.selectAll()
    state.nudge([1, 2])

    expect(state.getShape('rect2').point).toEqual([101, 102])

    state.undo()

    expect(state.getShape('rect2').point).toEqual([100, 100])

    state.redo()

    expect(state.getShape('rect2').point).toEqual([101, 102])
  })

  it('major nudges', () => {
    state.selectAll()
    state.nudge([1, 2], true)
    expect(state.getShape('rect2').point).toEqual([110, 120])
  })

  describe('when nudging shapes with bindings', () => {
    it('deleted bindings if nudging shape is bound to other shapes', () => {
      state
        .resetDocument()
        .createShapes(
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
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([50, 50])
        .completeSession()

      const bindingId = state.getShape<ArrowShape>('arrow1').handles.start.bindingId!

      state.select('arrow1').nudge([10, 10])

      expect(state.getBinding(bindingId)).toBeUndefined()
      expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBeUndefined()

      state.undo()

      expect(state.getBinding(bindingId)).toBeDefined()
      expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      state.redo()

      expect(state.getBinding(bindingId)).toBeUndefined()
      expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBeUndefined()
    })

    it('does not delete bindings if both bound and bound-to shapes are nudged', () => {
      state
        .resetDocument()
        .createShapes(
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
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([50, 50])
        .completeSession()

      const bindingId = state.getShape<ArrowShape>('arrow1').handles.start.bindingId!

      state.select('arrow1', 'target1').nudge([10, 10])

      expect(state.getBinding(bindingId)).toBeDefined()
      expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      state.undo()

      expect(state.getBinding(bindingId)).toBeDefined()
      expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      state.redo()

      expect(state.getBinding(bindingId)).toBeDefined()
      expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)
    })
  })
})

describe('When nudging groups', () => {
  it('nudges children instead', () => {
    const state = new TLDrawState()
      .loadDocument(mockDocument)
      .group(['rect1', 'rect2'], 'groupA')
      .nudge([1, 1])

    new TLDrawStateUtils(state).expectShapesToBeAtPoints({
      rect1: [1, 1],
      rect2: [101, 101],
    })
  })
})
