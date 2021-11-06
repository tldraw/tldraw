import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { SessionType, TLDrawStatus } from '~types'

describe('Grid session', () => {
  const tlstate = new TLDrawState()

  it('begins, updateSession', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.Translate, [5, 5])
      .updateSession([10, 10])

    expect(tlstate.getShape('rect1').point).toStrictEqual([5, 5])

    tlstate.completeSession()

    expect(tlstate.appState.status).toBe(TLDrawStatus.Idle)

    expect(tlstate.getShape('rect1').point).toStrictEqual([5, 5])

    tlstate.undo()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])

    tlstate.redo()

    expect(tlstate.getShape('rect1').point).toStrictEqual([5, 5])
  })

  it('cancels session', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startSession(SessionType.Translate, [5, 5])
      .updateSession([10, 10])
      .cancelSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
  })
})
