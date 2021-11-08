import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { SessionType, TLDrawShapeType, TLDrawStatus } from '~types'

describe('Handle session', () => {
  const state = new TLDrawState()

  it('begins, updateSession', () => {
    state
      .loadDocument(mockDocument)
      .createShapes({
        id: 'arrow1',
        type: TLDrawShapeType.Arrow,
      })
      .select('arrow1')
      .startSession(SessionType.Arrow, [-10, -10], 'end')
      .updateSession([10, 10])
      .completeSession()

    expect(state.appState.status).toBe(TLDrawStatus.Idle)

    state.undo().redo()
  })

  it('cancels session', () => {
    state
      .loadDocument(mockDocument)
      .createShapes({
        type: TLDrawShapeType.Arrow,
        id: 'arrow1',
      })
      .select('arrow1')
      .startSession(SessionType.Arrow, [-10, -10], 'end')
      .updateSession([10, 10])
      .cancelSession()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
  })
})
