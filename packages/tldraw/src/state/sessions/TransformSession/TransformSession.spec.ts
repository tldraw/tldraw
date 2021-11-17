import { mockDocument, TldrawTestApp } from '~test'
import { TLBoundsCorner, TLBoundsEdge, Utils } from '@tldraw/core'
import { TLDR } from '~state/TLDR'
import { TDShapeType, TDStatus } from '~types'

function getShapeBounds(app: TldrawTestApp, ...ids: string[]) {
  return Utils.getCommonBounds(
    (ids.length ? ids : app.selectedIds).map((id) => TLDR.getBounds(app.getShape(id)))
  )
}

describe('Transform session', () => {
  it('begins, updateSession', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)

    expect(getShapeBounds(app, 'rect1')).toMatchObject({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
      width: 100,
      height: 100,
    })

    app
      .select('rect1', 'rect2')
      .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
      .movePointer([10, 10])
      .completeSession()

    expect(app.status).toBe(TDStatus.Idle)

    expect(getShapeBounds(app, 'rect1')).toMatchObject({
      minX: 10,
      minY: 10,
      maxX: 105,
      maxY: 105,
      width: 95,
      height: 95,
    })

    app.undo()

    expect(getShapeBounds(app, 'rect1')).toMatchObject({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
      width: 100,
      height: 100,
    })

    app.redo()
  })

  it('cancels session', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 5, y: 5 })
      .movePointer([10, 10])
      .cancelSession()

    expect(app.getShape('rect1').point).toStrictEqual([0, 0])
  })

  describe('when transforming from the top-left corner', () => {
    it('transforms a single shape', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1')
        .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
        .movePointer([10, 10])
        .completeSession()

      expect(getShapeBounds(app)).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 100,
        maxY: 100,
        width: 90,
        height: 90,
      })
    })

    it('transforms a single shape while holding shift', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1')
        .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
        .movePointer({ x: 20, y: 10, shiftKey: true })
        .completeSession()

      expect(getShapeBounds(app, 'rect1')).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 100,
        maxY: 100,
        width: 90,
        height: 90,
      })
    })

    it('transforms multiple shapes', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
        .movePointer([10, 10])
        .completeSession()

      expect(getShapeBounds(app, 'rect1')).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 105,
        maxY: 105,
        width: 95,
        height: 95,
      })

      expect(getShapeBounds(app, 'rect2')).toMatchObject({
        minX: 105,
        minY: 105,
        maxX: 200,
        maxY: 200,
        width: 95,
        height: 95,
      })
    })

    it('transforms multiple shapes while holding shift', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
        .movePointer({ x: 20, y: 10, shiftKey: true })
        .completeSession()

      expect(getShapeBounds(app, 'rect1')).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 105,
        maxY: 105,
        width: 95,
        height: 95,
      })

      expect(getShapeBounds(app, 'rect2')).toMatchObject({
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
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .select('groupA')
        .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
        .movePointer([10, 10])
        .completeSession()

      expect(getShapeBounds(app, 'rect1')).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 105,
        maxY: 105,
        width: 95,
        height: 95,
      })

      expect(getShapeBounds(app, 'rect2')).toMatchObject({
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
    const app = new TldrawTestApp()
      .selectTool(TDShapeType.Rectangle)
      .pointCanvas([0, 0])
      .movePointer([10, 10])
      .stopPointing()

    expect(app.shapes.length).toBe(1)

    app.undo()

    expect(app.shapes.length).toBe(0)
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

describe('When holding alt', () => {
  it('resizes edge from center', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)

    const beforeCenter = Utils.getBoundsCenter(
      Utils.getCommonBounds(app.shapes.map(TLDR.getBounds))
    )

    app
      .selectAll()
      .pointBoundsHandle(TLBoundsEdge.Left, { x: 0, y: 0 })
      .movePointer({ x: 20, y: 10, altKey: true })
      .completeSession()

    const afterCenter = Utils.getBoundsCenter(Utils.getCommonBounds(app.shapes.map(TLDR.getBounds)))

    expect(beforeCenter).toEqual(afterCenter)
  })

  it('resizes edge from center while holding shift', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)

    const beforeCenter = Utils.getBoundsCenter(
      Utils.getCommonBounds(app.shapes.map(TLDR.getBounds))
    )

    app
      .selectAll()
      .pointBoundsHandle(TLBoundsEdge.Left, { x: 0, y: 0 })
      .movePointer({ x: 20, y: 10, shiftKey: true, altKey: true })
      .completeSession()

    const afterCenter = Utils.getBoundsCenter(Utils.getCommonBounds(app.shapes.map(TLDR.getBounds)))

    expect(beforeCenter).toEqual(afterCenter)
  })

  it('resizes corner from center', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)

    const beforeCenter = Utils.getBoundsCenter(
      Utils.getCommonBounds(app.shapes.map(TLDR.getBounds))
    )

    app
      .selectAll()
      .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
      .movePointer({ x: 20, y: 10, altKey: true })
      .completeSession()

    const afterCenter = Utils.getBoundsCenter(Utils.getCommonBounds(app.shapes.map(TLDR.getBounds)))

    expect(beforeCenter).toEqual(afterCenter)
  })

  it('resizes corner from center while holding shift', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)

    const beforeCenter = Utils.getBoundsCenter(
      Utils.getCommonBounds(app.shapes.map(TLDR.getBounds))
    )

    app
      .selectAll()
      .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
      .movePointer({ x: 20, y: 10, shiftKey: true, altKey: true })
      .completeSession()

    const afterCenter = Utils.getBoundsCenter(Utils.getCommonBounds(app.shapes.map(TLDR.getBounds)))

    expect(beforeCenter).toEqual(afterCenter)
  })
})
