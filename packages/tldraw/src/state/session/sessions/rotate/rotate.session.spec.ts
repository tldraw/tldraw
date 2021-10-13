import Vec from '@tldraw/vec'
import { Utils } from '@tldraw/core'
import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { SessionType, TLDrawStatus } from '~types'

describe('Rotate session', () => {
  const tlstate = new TLDrawState()

  it('begins, updateSession', () => {
    tlstate.loadDocument(mockDocument)

    expect(tlstate.getShape('rect1').rotation).toBe(undefined)

    tlstate.select('rect1').startSession(SessionType.Rotate, [50, 0]).updateSession([100, 50])

    expect(tlstate.getShape('rect1').rotation).toBe(Math.PI / 2)

    tlstate.updateSession([50, 100])

    expect(tlstate.getShape('rect1').rotation).toBe(Math.PI)

    tlstate.updateSession([0, 50])

    expect(tlstate.getShape('rect1').rotation).toBe((Math.PI * 3) / 2)

    tlstate.updateSession([50, 0])

    expect(tlstate.getShape('rect1').rotation).toBe(0)

    tlstate.updateSession([0, 50])

    expect(tlstate.getShape('rect1').rotation).toBe((Math.PI * 3) / 2)

    tlstate.completeSession()

    expect(tlstate.appState.status.current).toBe(TLDrawStatus.Idle)

    tlstate.undo()

    expect(tlstate.getShape('rect1').rotation).toBe(undefined)

    tlstate.redo()

    expect(tlstate.getShape('rect1').rotation).toBe((Math.PI * 3) / 2)
  })

  it('cancels session', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startSession(SessionType.Rotate, [50, 0])
      .updateSession([100, 50])
      .cancel()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
  })

  it.todo('rotates handles only on shapes with handles')

  describe('when rotating a single shape while pressing shift', () => {
    it('Clamps rotation to 15 degrees', () => {
      const tlstate = new TLDrawState()

      tlstate
        .loadDocument(mockDocument)
        .select('rect1')
        .startSession(SessionType.Rotate, [0, 0])
        .updateSession([20, 10], true)
        .completeSession()

      expect(Math.round((tlstate.getShape('rect1').rotation || 0) * (180 / Math.PI)) % 15).toEqual(
        0
      )
    })

    it('Clamps rotation to 15 degrees when starting from a rotation', () => {
      // Rect 1 is a little rotated
      const tlstate = new TLDrawState()

      tlstate
        .loadDocument(mockDocument)
        .select('rect1')
        .startSession(SessionType.Rotate, [0, 0])
        .updateSession([5, 5])
        .completeSession()

      // Rect 1 clamp rotated, starting from a little rotation
      tlstate
        .select('rect1')
        .startSession(SessionType.Rotate, [0, 0])
        .updateSession([100, 200], true)
        .completeSession()

      expect(Math.round((tlstate.getShape('rect1').rotation || 0) * (180 / Math.PI)) % 15).toEqual(
        0
      )

      // Try again, too.
      tlstate
        .select('rect1')
        .startSession(SessionType.Rotate, [0, 0])
        .updateSession([-100, 5000], true)
        .completeSession()

      expect(Math.round((tlstate.getShape('rect1').rotation || 0) * (180 / Math.PI)) % 15).toEqual(
        0
      )
    })
  })

  describe('when rotating multiple shapes', () => {
    it('keeps the center', () => {
      tlstate.loadDocument(mockDocument).select('rect1', 'rect2')

      const centerBefore = Vec.round(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(tlstate.selectedIds.map((id) => tlstate.getShapeBounds(id)))
        )
      )

      tlstate.startSession(SessionType.Rotate, [50, 0]).updateSession([100, 50])

      const centerAfter = Vec.round(
        Utils.getBoundsCenter(
          Utils.getCommonBounds(tlstate.selectedIds.map((id) => tlstate.getShapeBounds(id)))
        )
      )

      expect(tlstate.getShape('rect1').rotation)
      expect(centerBefore).toStrictEqual(centerAfter)
    })
  })
})
