import { TLDrawState } from '../../../tlstate'
import { mockDocument } from '../../../test-helpers'
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
})
