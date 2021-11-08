import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { SessionType, TLDrawShapeType } from '~types'

describe('Delete command', () => {
  const state = new TLDrawState()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = state.state
      state.delete()
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    state.select('rect2')
    state.delete()

    expect(state.getShape('rect2')).toBe(undefined)
    expect(state.getPageState().selectedIds.length).toBe(0)

    state.undo()

    expect(state.getShape('rect2')).toBeTruthy()
    expect(state.getPageState().selectedIds.length).toBe(1)

    state.redo()

    expect(state.getShape('rect2')).toBe(undefined)
    expect(state.getPageState().selectedIds.length).toBe(0)
  })

  it('deletes two shapes', () => {
    state.selectAll()
    state.delete()

    expect(state.getShape('rect1')).toBe(undefined)
    expect(state.getShape('rect2')).toBe(undefined)

    state.undo()

    expect(state.getShape('rect1')).toBeTruthy()
    expect(state.getShape('rect2')).toBeTruthy()

    state.redo()

    expect(state.getShape('rect1')).toBe(undefined)
    expect(state.getShape('rect2')).toBe(undefined)
  })

  it('deletes bound shapes, undoes and redoes', () => {
    new TLDrawState()
      .createShapes(
        { type: TLDrawShapeType.Rectangle, id: 'target1', point: [0, 0], size: [100, 100] },
        { type: TLDrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
      )
      .select('arrow1')
      .startSession(SessionType.Arrow, [200, 200], 'start')
      .updateSession([50, 50])
      .completeSession()
      .delete()
      .undo()
  })

  it('deletes bound shapes', () => {
    expect(Object.values(state.page.bindings)[0]).toBe(undefined)

    state
      .selectNone()
      .createShapes({
        id: 'arrow1',
        type: TLDrawShapeType.Arrow,
      })
      .select('arrow1')
      .startSession(SessionType.Arrow, [0, 0], 'start')
      .updateSession([110, 110])
      .completeSession()

    const binding = Object.values(state.page.bindings)[0]

    expect(binding).toBeTruthy()
    expect(binding.fromId).toBe('arrow1')
    expect(binding.toId).toBe('rect3')
    expect(binding.handleId).toBe('start')
    expect(state.getShape('arrow1').handles?.start.bindingId).toBe(binding.id)

    state.select('rect3').delete()

    expect(Object.values(state.page.bindings)[0]).toBe(undefined)
    expect(state.getShape('arrow1').handles?.start.bindingId).toBe(undefined)

    state.undo()

    expect(Object.values(state.page.bindings)[0]).toBeTruthy()
    expect(state.getShape('arrow1').handles?.start.bindingId).toBe(binding.id)

    state.redo()

    expect(Object.values(state.page.bindings)[0]).toBe(undefined)
    expect(state.getShape('arrow1').handles?.start.bindingId).toBe(undefined)
  })

  describe('when deleting shapes in a group', () => {
    it('updates the group', () => {
      state.group(['rect1', 'rect2', 'rect3'], 'newGroup').select('rect1').delete()

      expect(state.getShape('rect1')).toBeUndefined()
      expect(state.getShape('newGroup').children).toStrictEqual(['rect2', 'rect3'])
    })
  })

  describe('when deleting a group', () => {
    it('deletes all grouped shapes', () => {
      state.group(['rect1', 'rect2'], 'newGroup').select('newGroup').delete()

      expect(state.getShape('rect1')).toBeUndefined()
      expect(state.getShape('rect2')).toBeUndefined()
      expect(state.getShape('newGroup')).toBeUndefined()
    })
  })

  it.todo('Does not delete uneffected bindings.')
})
