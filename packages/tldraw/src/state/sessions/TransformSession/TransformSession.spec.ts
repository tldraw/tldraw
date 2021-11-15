import { mockDocument, TLDrawTestApp } from '~test'
import { TLBoundsCorner, Utils } from '@tldraw/core'
import { TLDR } from '~state/TLDR'
import { SessionType, TLDrawShapeType, TLDrawStatus } from '~types'

function getShapeBounds(state: TLDrawTestApp, ...ids: string[]) {
  return Utils.getCommonBounds(
    (ids.length ? ids : state.selectedIds).map((id) => TLDR.getBounds(state.getShape(id)))
  )
}

describe('Transform session', () => {
  it('begins, updateSession', () => {
    const state = new TLDrawTestApp().loadDocument(mockDocument)

    expect(getShapeBounds(state, 'rect1')).toMatchObject({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
      width: 100,
      height: 100,
    })

    state
      .select('rect1', 'rect2')
      .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
      .movePointer([10, 10])
      .completeSession()

    expect(state.appState.status).toBe(TLDrawStatus.Idle)

    expect(getShapeBounds(state, 'rect1')).toMatchObject({
      minX: 10,
      minY: 10,
      maxX: 105,
      maxY: 105,
      width: 95,
      height: 95,
    })

    state.undo()

    expect(getShapeBounds(state, 'rect1')).toMatchObject({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
      width: 100,
      height: 100,
    })

    state.redo()
  })

  it('cancels session', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 5, y: 5 })
      .movePointer([10, 10])
      .cancelSession()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
  })

  describe('when transforming from the top-left corner', () => {
    it('transforms a single shape', () => {
      const state = new TLDrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1')
        .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
        .movePointer([10, 10])
        .completeSession()

      expect(getShapeBounds(state)).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 100,
        maxY: 100,
        width: 90,
        height: 90,
      })
    })

    it('transforms a single shape while holding shift', () => {
      const state = new TLDrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1')
        .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
        .movePointer({ x: 20, y: 10, shiftKey: true })
        .completeSession()

      expect(getShapeBounds(state, 'rect1')).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 100,
        maxY: 100,
        width: 90,
        height: 90,
      })
    })

    it('transforms multiple shapes', () => {
      const state = new TLDrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
        .movePointer([10, 10])
        .completeSession()

      expect(getShapeBounds(state, 'rect1')).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 105,
        maxY: 105,
        width: 95,
        height: 95,
      })

      expect(getShapeBounds(state, 'rect2')).toMatchObject({
        minX: 105,
        minY: 105,
        maxX: 200,
        maxY: 200,
        width: 95,
        height: 95,
      })
    })

    it('transforms multiple shapes while holding shift', () => {
      const state = new TLDrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
        .movePointer({ x: 20, y: 10, shiftKey: true })
        .completeSession()

      expect(getShapeBounds(state, 'rect1')).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 105,
        maxY: 105,
        width: 95,
        height: 95,
      })

      expect(getShapeBounds(state, 'rect2')).toMatchObject({
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
      const state = new TLDrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .select('groupA')
        .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
        .movePointer([10, 10])
        .completeSession()

      expect(getShapeBounds(state, 'rect1')).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 105,
        maxY: 105,
        width: 95,
        height: 95,
      })

      expect(getShapeBounds(state, 'rect2')).toMatchObject({
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
    const state = new TLDrawTestApp()
      .selectTool(TLDrawShapeType.Rectangle)
      .pointCanvas([0, 0])
      .movePointer([10, 10])
      .stopPointing()

    expect(state.shapes.length).toBe(1)

    state.undo()

    expect(state.shapes.length).toBe(0)
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
