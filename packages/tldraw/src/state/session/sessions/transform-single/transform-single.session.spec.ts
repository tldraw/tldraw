import { TLDrawState } from '~state'
import { mockDocument } from '~test-utils'
import { TLBoundsCorner } from '@tldraw/core'

describe('Transform single session', () => {
  const tlstate = new TLDrawState()

  it('begins, updates and completes session', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startTransformSession([-10, -10], TLBoundsCorner.TopLeft)
      .updateTransformSession([10, 10])
      .completeSession()
      .undo()
      .redo()
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
