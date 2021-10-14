import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { SessionType, TLDrawShapeType, TLDrawStatus } from '~types'

describe('Handle session', () => {
  const tlstate = new TLDrawState()

  it('begins, updateSession', () => {
    tlstate
      .loadDocument(mockDocument)
      .createShapes({
        id: 'arrow1',
        type: TLDrawShapeType.Arrow,
      })
      .select('arrow1')
      .startSession(SessionType.Arrow, [-10, -10], 'end')
      .updateSession([10, 10])
      .completeSession()

    expect(tlstate.appState.status).toBe(TLDrawStatus.Idle)

    tlstate.undo().redo()
  })

  it('cancels session', () => {
    tlstate
      .loadDocument(mockDocument)
      .createShapes({
        type: TLDrawShapeType.Arrow,
        id: 'arrow1',
      })
      .select('arrow1')
      .startSession(SessionType.Arrow, [-10, -10], 'end')
      .updateSession([10, 10])
      .cancelSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
  })
})
