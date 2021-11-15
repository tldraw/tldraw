import Vec from '@tldraw/vec'
import { Utils } from '@tldraw/core'
import { mockDocument, TLDrawTestApp } from '~test'
import { SessionType, TLDrawStatus } from '~types'

describe('Rotate session', () => {
  const state = new TLDrawTestApp()

  it('begins, updates session', () => {
    state.loadDocument(mockDocument)

    expect(state.getShape('rect1').rotation).toBe(undefined)

    state.select('rect1').pointBoundsHandle('rotate', { x: 50, y: 0 }).movePointer([100, 50])

    expect(state.getShape('rect1').rotation).toBe(Math.PI / 2)

    state.movePointer([50, 100])

    expect(state.getShape('rect1').rotation).toBe(Math.PI)

    state.movePointer([0, 50])

    expect(state.getShape('rect1').rotation).toBe((Math.PI * 3) / 2)

    state.movePointer([50, 0])

    expect(state.getShape('rect1').rotation).toBe(0)

    state.movePointer([0, 50])

    expect(state.getShape('rect1').rotation).toBe((Math.PI * 3) / 2)

    state.completeSession()

    expect(state.appState.status).toBe(TLDrawStatus.Idle)

    state.undo()

    expect(state.getShape('rect1').rotation).toBe(undefined)

    state.redo()

    expect(state.getShape('rect1').rotation).toBe((Math.PI * 3) / 2)
  })

  it('cancels session', () => {
    state
      .loadDocument(mockDocument)
      .select('rect1')
      .pointBoundsHandle('rotate', { x: 50, y: 0 })
      .movePointer([100, 50])
      .cancel()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
  })

  it.todo('rotates handles only on shapes with handles')

  describe('when rotating a single shape while pressing shift', () => {
    it('Clamps rotation to 15 degrees', () => {
      const state = new TLDrawTestApp()

      state
        .loadDocument(mockDocument)
        .select('rect1')
        .pointBoundsHandle('rotate', { x: 0, y: 0 })
        .movePointer({ x: 20, y: 10, shiftKey: true })
        .completeSession()

      expect(Math.round((state.getShape('rect1').rotation || 0) * (180 / Math.PI)) % 15).toEqual(0)
    })

    it('Clamps rotation to 15 degrees when starting from a rotation', () => {
      // Rect 1 is a little rotated
      const state = new TLDrawTestApp()

      state
        .loadDocument(mockDocument)
        .select('rect1')
        .pointBoundsHandle('rotate', { x: 0, y: 0 })
        .movePointer([5, 5])
        .completeSession()

      // Rect 1 clamp rotated, starting from a little rotation
      state
        .select('rect1')
        .pointBoundsHandle('rotate', { x: 0, y: 0 })
        .movePointer({ x: 100, y: 200, shiftKey: true })
        .completeSession()

      expect(Math.round((state.getShape('rect1').rotation || 0) * (180 / Math.PI)) % 15).toEqual(0)

      // Try again, too.
      state
        .select('rect1')
        .pointBoundsHandle('rotate', { x: 0, y: 0 })
        .movePointer({ x: -100, y: 5000, shiftKey: true })
        .completeSession()

      expect(Math.round((state.getShape('rect1').rotation || 0) * (180 / Math.PI)) % 15).toEqual(0)
    })
  })

  describe('when rotating multiple shapes', () => {
    it('keeps the center', () => {
      state.loadDocument(mockDocument).select('rect1', 'rect2')

      const centerBefore = Vec.round(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(state.selectedIds.map((id) => state.getShapeBounds(id)))
        )
      )

      state.pointBoundsHandle('rotate', { x: 50, y: 0 }).movePointer([100, 50]).completeSession()

      const centerAfterA = Vec.round(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(state.selectedIds.map((id) => state.getShapeBounds(id)))
        )
      )

      state.pointBoundsHandle('rotate', { x: 100, y: 0 }).movePointer([50, 0]).completeSession()

      const centerAfterB = Vec.round(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(state.selectedIds.map((id) => state.getShapeBounds(id)))
        )
      )

      expect(state.getShape('rect1').rotation)
      expect(centerBefore).toStrictEqual(centerAfterA)
      expect(centerAfterA).toStrictEqual(centerAfterB)
    })

    it.todo('clears the cached center after transforming')
    it.todo('clears the cached center after translating')
    it.todo('clears the cached center after undoing')
    it.todo('clears the cached center after redoing')
    it.todo('clears the cached center after any command other than a rotate command, tbh')

    it('changes the center after nudging', () => {
      const state = new TLDrawTestApp().loadDocument(mockDocument).select('rect1', 'rect2')

      const centerBefore = Vec.round(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(state.selectedIds.map((id) => state.getShapeBounds(id)))
        )
      )

      state.pointBoundsHandle('rotate', { x: 50, y: 0 }).movePointer([100, 50]).completeSession()

      const centerAfterA = Vec.round(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(state.selectedIds.map((id) => state.getShapeBounds(id)))
        )
      )

      expect(state.getShape('rect1').rotation)
      expect(centerBefore).toStrictEqual(centerAfterA)

      state.selectAll().nudge([10, 10])

      state.pointBoundsHandle('rotate', { x: 50, y: 0 }).movePointer([100, 50]).completeSession()

      const centerAfterB = Vec.round(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(state.selectedIds.map((id) => state.getShapeBounds(id)))
        )
      )

      expect(centerAfterB).not.toStrictEqual(centerAfterA)
    })
  })
})
