import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { TLBoundsCorner, Utils } from '@tldraw/core'
import { TLDR } from '~state/tldr'
import { SessionType, TLDrawStatus } from '~types'

function getShapeBounds(tlstate: TLDrawState, ...ids: string[]) {
  return Utils.getCommonBounds(
    (ids.length ? ids : tlstate.selectedIds).map((id) => TLDR.getBounds(tlstate.getShape(id)))
  )
}

describe('Transform session', () => {
  const tlstate = new TLDrawState()

  it('begins, updateSession', () => {
    tlstate.loadDocument(mockDocument)

    expect(getShapeBounds(tlstate, 'rect1')).toMatchObject({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
      width: 100,
      height: 100,
    })

    tlstate
      .select('rect1', 'rect2')
      .startSession(SessionType.Transform, [0, 0], TLBoundsCorner.TopLeft)
      .updateSession([10, 10])
      .completeSession()

    expect(tlstate.appState.status).toBe(TLDrawStatus.Idle)

    expect(getShapeBounds(tlstate, 'rect1')).toMatchObject({
      minX: 10,
      minY: 10,
      maxX: 105,
      maxY: 105,
      width: 95,
      height: 95,
    })

    tlstate.undo()

    expect(getShapeBounds(tlstate, 'rect1')).toMatchObject({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
      width: 100,
      height: 100,
    })

    tlstate.redo()
  })

  it('cancels session', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .startSession(SessionType.Transform, [5, 5], TLBoundsCorner.TopLeft)
      .updateSession([10, 10])
      .cancelSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
  })

  describe('when transforming from the top-left corner', () => {
    it('transforms a single shape', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1')
        .startSession(SessionType.Transform, [0, 0], TLBoundsCorner.TopLeft)
        .updateSession([10, 10])
        .completeSession()

      expect(getShapeBounds(tlstate)).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 100,
        maxY: 100,
        width: 90,
        height: 90,
      })
    })

    it('transforms a single shape while holding shift', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1')
        .startSession(SessionType.Transform, [0, 0], TLBoundsCorner.TopLeft)
        .updateSession([20, 10], true)
        .completeSession()

      expect(getShapeBounds(tlstate, 'rect1')).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 100,
        maxY: 100,
        width: 90,
        height: 90,
      })
    })

    it('transforms multiple shapes', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .startSession(SessionType.Transform, [0, 0], TLBoundsCorner.TopLeft)
        .updateSession([10, 10])
        .completeSession()

      expect(getShapeBounds(tlstate, 'rect1')).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 105,
        maxY: 105,
        width: 95,
        height: 95,
      })

      expect(getShapeBounds(tlstate, 'rect2')).toMatchObject({
        minX: 105,
        minY: 105,
        maxX: 200,
        maxY: 200,
        width: 95,
        height: 95,
      })
    })

    it('transforms multiple shapes while holding shift', () => {
      tlstate
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .startSession(SessionType.Transform, [0, 0], TLBoundsCorner.TopLeft)
        .updateSession([20, 10], true)
        .completeSession()

      expect(getShapeBounds(tlstate, 'rect1')).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 105,
        maxY: 105,
        width: 95,
        height: 95,
      })

      expect(getShapeBounds(tlstate, 'rect2')).toMatchObject({
        minX: 105,
        minY: 105,
        maxX: 200,
        maxY: 200,
        width: 95,
        height: 95,
      })
    })
  })

  describe('when transforming from the top-right corner', () => {
    // Todo
  })

  describe('when transforming from the bottom-right corner', () => {
    // Todo
  })

  describe('when transforming from the bottom-left corner', () => {
    // Todo
  })

  describe('when transforming from the top edge', () => {
    // Todo
  })

  describe('when transforming from the right edge', () => {
    // Todo
  })

  describe('when transforming from the bottom edge', () => {
    // Todo
  })

  describe('when transforming from the left edge', () => {
    // Todo
  })

  describe('when transforming a group', () => {
    it('transforms the groups children', () => {
      const tlstate = new TLDrawState()
      tlstate
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .select('groupA')
        .startSession(SessionType.Transform, [0, 0], TLBoundsCorner.TopLeft)
        .updateSession([10, 10])
        .completeSession()

      expect(getShapeBounds(tlstate, 'rect1')).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 105,
        maxY: 105,
        width: 95,
        height: 95,
      })

      expect(getShapeBounds(tlstate, 'rect2')).toMatchObject({
        minX: 105,
        minY: 105,
        maxX: 200,
        maxY: 200,
        width: 95,
        height: 95,
      })
    })
  })
})

describe('When creating with a transform session', () => {
  it('Deletes the shape on undo', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.Transform, [5, 5], TLBoundsCorner.TopLeft, true)
      .updateSession([10, 10])
      .completeSession()
      .undo()

    expect(tlstate.getShape('rect1')).toBe(undefined)
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
