import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { TLBoundsCorner } from '@tldraw/core'
import { SessionType, TLDrawStatus } from '~types'

describe('Transform single session', () => {
  const tlstate = new TLDrawState()

  it('begins, updateSession', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.TransformSingle, [-10, -10], TLBoundsCorner.TopLeft)
      .updateSession([10, 10])
      .completeSession()

    expect(tlstate.appState.status).toBe(TLDrawStatus.Idle)

    tlstate.undo().redo()
  })

  it('cancels session', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.TransformSingle, [5, 5], TLBoundsCorner.TopLeft)
      .updateSession([10, 10])
      .cancelSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
  })
})

describe('When creating with a transform-single session', () => {
  it('Deletes the shape on undo', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.TransformSingle, [5, 5], TLBoundsCorner.TopLeft, true)
      .updateSession([10, 10])
      .completeSession()
      .undo()

    expect(tlstate.getShape('rect1')).toBe(undefined)
  })
})
