import { mockDocument, TldrawTestApp } from '~test'
import { TLBoundsCorner, TLBoundsEdge, Utils } from '@tldraw/core'
import { TDStatus } from '~types'
import { TLDR } from '~state/TLDR'

describe('Transform single session', () => {
  it('begins, updateSession', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1')
      .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: -10, y: -10 })
      .stopPointing()

    expect(app.status).toBe(TDStatus.Idle)

    app.undo().redo()
  })

  it('cancels session', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1')
      .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 5, y: 5 })
      .cancelSession()

    expect(app.getShape('rect1').point).toStrictEqual([0, 0])
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

    const beforeCenter = Utils.getBoundsCenter(app.getShapeBounds('rect1'))

    app
      .select('rect1')
      .pointBoundsHandle(TLBoundsEdge.Left, { x: 0, y: 0 })
      .movePointer({ x: 20, y: 10, altKey: true })
      .completeSession()

    const afterCenter = Utils.getBoundsCenter(app.getShapeBounds('rect1'))
    expect(beforeCenter).toEqual(afterCenter)
  })

  it('resizes edge from center while holding shift', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)

    const beforeCenter = Utils.getBoundsCenter(app.getShapeBounds('rect1'))

    app
      .select('rect1')
      .pointBoundsHandle(TLBoundsEdge.Left, { x: 0, y: 0 })
      .movePointer({ x: 20, y: 10, shiftKey: true, altKey: true })
      .completeSession()

    const afterCenter = Utils.getBoundsCenter(app.getShapeBounds('rect1'))

    expect(beforeCenter).toEqual(afterCenter)
  })

  it('resizes corner from center', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)

    const beforeCenter = Utils.getBoundsCenter(app.getShapeBounds('rect1'))

    app
      .select('rect1')
      .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
      .movePointer({ x: 20, y: 10, altKey: true })
      .completeSession()

    const afterCenter = Utils.getBoundsCenter(app.getShapeBounds('rect1'))
    expect(beforeCenter).toEqual(afterCenter)
  })

  it('resizes corner from center while holding shift', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument)

    const beforeCenter = Utils.getBoundsCenter(app.getShapeBounds('rect1'))

    app
      .select('rect1')
      .pointBoundsHandle(TLBoundsCorner.TopLeft, { x: 0, y: 0 })
      .movePointer({ x: 20, y: 10, shiftKey: true, altKey: true })
      .completeSession()

    const afterCenter = Utils.getBoundsCenter(app.getShapeBounds('rect1'))
    expect(beforeCenter).toEqual(afterCenter)
  })
})
