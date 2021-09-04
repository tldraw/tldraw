import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { TLBoundsCorner } from '@tldraw/core'
import { TLDrawStatus } from '~types'

describe('Transform single session', () => {
  const tlstate = new TLDrawState()

  it('begins, updates and completes session', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startTransformSession([-10, -10], TLBoundsCorner.TopLeft)
      .updateTransformSession([10, 10])
      .completeSession()

    expect(tlstate.appState.status.current).toBe(TLDrawStatus.Idle)

    tlstate.undo().redo()
  })

  it('cancels session', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startTransformSession([5, 5], TLBoundsCorner.TopLeft)
      .updateTransformSession([10, 10])
      .cancelSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
  })
})
