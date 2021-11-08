import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { SessionType, TLDrawStatus } from '~types'

describe('Grid session', () => {
  const state = new TLDrawState()

  it('begins, updateSession', () => {
    state
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.Translate, [5, 5])
      .updateSession([10, 10])

    expect(state.getShape('rect1').point).toStrictEqual([5, 5])

    state.completeSession()

    expect(state.appState.status).toBe(TLDrawStatus.Idle)

    expect(state.getShape('rect1').point).toStrictEqual([5, 5])

    state.undo()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])

    state.redo()

    expect(state.getShape('rect1').point).toStrictEqual([5, 5])
  })

  it('cancels session', () => {
    state
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startSession(SessionType.Translate, [5, 5])
      .updateSession([10, 10])
      .cancelSession()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
  })
})
