import Vec from '@tldraw/vec'
import { Utils } from '@tldraw/core'
import { mockDocument, TldrawTestApp } from '~test'
import { SessionType, TDStatus } from '~types'

describe('Rotate session', () => {
  const app = new TldrawTestApp()

  it('begins, updates session', () => {
    app.loadDocument(mockDocument)

    expect(app.getShape('rect1').rotation).toBe(undefined)

    app.select('rect1').pointBoundsHandle('rotate', { x: 50, y: 0 }).movePointer([100, 50])

    expect(app.getShape('rect1').rotation).toBe(Math.PI / 2)

    app.movePointer([50, 100])

    expect(app.getShape('rect1').rotation).toBe(Math.PI)

    app.movePointer([0, 50])

    expect(app.getShape('rect1').rotation).toBe((Math.PI * 3) / 2)

    app.movePointer([50, 0])

    expect(app.getShape('rect1').rotation).toBe(0)

    app.movePointer([0, 50])

    expect(app.getShape('rect1').rotation).toBe((Math.PI * 3) / 2)

    app.completeSession()

    expect(app.appState.status).toBe(TDStatus.Idle)

    app.undo()

    expect(app.getShape('rect1').rotation).toBe(undefined)

    app.redo()

    expect(app.getShape('rect1').rotation).toBe((Math.PI * 3) / 2)
  })

  it('cancels session', () => {
    app
      .loadDocument(mockDocument)
      .select('rect1')
      .pointBoundsHandle('rotate', { x: 50, y: 0 })
      .movePointer([100, 50])
      .cancel()

    expect(app.getShape('rect1').point).toStrictEqual([0, 0])
  })

  it.todo('rotates handles only on shapes with handles')

  describe('when rotating a single shape while pressing shift', () => {
    it('Clamps rotation to 15 degrees', () => {
      const app = new TldrawTestApp()

      app
        .loadDocument(mockDocument)
        .select('rect1')
        .pointBoundsHandle('rotate', { x: 0, y: 0 })
        .movePointer({ x: 20, y: 10, shiftKey: true })
        .completeSession()

      expect(Math.round((app.getShape('rect1').rotation || 0) * (180 / Math.PI)) % 15).toEqual(0)
    })

    it('Clamps rotation to 15 degrees when starting from a rotation', () => {
      // Rect 1 is a little rotated
      const app = new TldrawTestApp()

      app
        .loadDocument(mockDocument)
        .select('rect1')
        .pointBoundsHandle('rotate', { x: 0, y: 0 })
        .movePointer([5, 5])
        .completeSession()

      // Rect 1 clamp rotated, starting from a little rotation
      app
        .select('rect1')
        .pointBoundsHandle('rotate', { x: 0, y: 0 })
        .movePointer({ x: 100, y: 200, shiftKey: true })
        .completeSession()

      expect(Math.round((app.getShape('rect1').rotation || 0) * (180 / Math.PI)) % 15).toEqual(0)

      // Try again, too.
      app
        .select('rect1')
        .pointBoundsHandle('rotate', { x: 0, y: 0 })
        .movePointer({ x: -100, y: 5000, shiftKey: true })
        .completeSession()

      expect(Math.round((app.getShape('rect1').rotation || 0) * (180 / Math.PI)) % 15).toEqual(0)
    })
  })

  describe('when rotating multiple shapes', () => {
    it('keeps the center', () => {
      app.loadDocument(mockDocument).select('rect1', 'rect2')

      const centerBefore = Vec.toFixed(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(app.selectedIds.map((id) => app.getShapeBounds(id)))
        )
      )

      app.pointBoundsHandle('rotate', { x: 50, y: 0 }).movePointer([100, 50]).completeSession()

      const centerAfterA = Vec.toFixed(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(app.selectedIds.map((id) => app.getShapeBounds(id)))
        )
      )

      app.pointBoundsHandle('rotate', { x: 100, y: 0 }).movePointer([50, 0]).completeSession()

      const centerAfterB = Vec.toFixed(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(app.selectedIds.map((id) => app.getShapeBounds(id)))
        )
      )

      expect(app.getShape('rect1').rotation)
      expect(centerBefore).toStrictEqual(centerAfterA)
      expect(centerAfterA).toStrictEqual(centerAfterB)
    })

    it.todo('clears the cached center after transforming')
    it.todo('clears the cached center after translating')
    it.todo('clears the cached center after undoing')
    it.todo('clears the cached center after redoing')
    it.todo('clears the cached center after any command other than a rotate command, tbh')

    it('changes the center after nudging', () => {
      const app = new TldrawTestApp().loadDocument(mockDocument).select('rect1', 'rect2')

      const centerBefore = Vec.toFixed(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(app.selectedIds.map((id) => app.getShapeBounds(id)))
        )
      )

      app.pointBoundsHandle('rotate', { x: 50, y: 0 }).movePointer([100, 50]).completeSession()

      const centerAfterA = Vec.toFixed(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(app.selectedIds.map((id) => app.getShapeBounds(id)))
        )
      )

      expect(app.getShape('rect1').rotation)
      expect(centerBefore).toStrictEqual(centerAfterA)

      app.selectAll().nudge([10, 10])

      app.pointBoundsHandle('rotate', { x: 50, y: 0 }).movePointer([100, 50]).completeSession()

      const centerAfterB = Vec.toFixed(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(app.selectedIds.map((id) => app.getShapeBounds(id)))
        )
      )

      expect(centerAfterB).not.toStrictEqual(centerAfterA)
    })
  })
})
