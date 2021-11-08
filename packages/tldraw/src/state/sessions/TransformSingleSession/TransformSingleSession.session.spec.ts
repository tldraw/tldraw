import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { TLBoundsCorner } from '@tldraw/core'
import { SessionType, TLDrawStatus } from '~types'

describe('Transform single session', () => {
  const state = new TLDrawState()

  it('begins, updateSession', () => {
    state
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.TransformSingle, [-10, -10], TLBoundsCorner.TopLeft)
      .updateSession([10, 10])
      .completeSession()

    expect(state.appState.status).toBe(TLDrawStatus.Idle)

    state.undo().redo()
  })

  it('cancels session', () => {
    state
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.TransformSingle, [5, 5], TLBoundsCorner.TopLeft)
      .updateSession([10, 10])
      .cancelSession()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
  })
})

describe('When creating with a transform-single session', () => {
  it('Deletes the shape on undo', () => {
    const state = new TLDrawState()
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.TransformSingle, [5, 5], TLBoundsCorner.TopLeft, true)
      .updateSession([10, 10])
      .completeSession()
      .undo()

    expect(state.getShape('rect1')).toBe(undefined)
  })
})

describe('When snapping', () => {
  it.todo('Does not snap when moving quicky')
  it.todo('Snaps only matching edges when moving slowly')
  it.todo('Snaps any edge to any edge when moving very slowly')
  it.todo('Snaps a clone to its parent')
  it.todo('Cleans up snap lines when cancelled')
  it.todo('Cleans up snap lines when completed')
  it.todo('Cleans up snap lines when starting to clone / not clone')
  it.todo('Snaps the rotated bounding box of rotated shapes')
  it.todo('Snaps to a shape on screen')
  it.todo('Does not snap to a shape off screen.')
  it.todo('Snaps while panning.')
})
