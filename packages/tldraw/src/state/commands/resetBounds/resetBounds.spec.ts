import { TLBoundsCorner, Utils } from '@tldraw/core'
import { TLDR } from '~state/TLDR'
import { mockDocument, TLDrawTestApp } from '~test'
import { SessionType, TLDrawShapeType } from '~types'

describe('Reset bounds command', () => {
  const state = new TLDrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  it('does, undoes and redoes command', () => {
    state.createShapes({
      id: 'text1',
      type: TLDrawShapeType.Text,
      point: [0, 0],
      text: 'Hello World',
    })

    // Scale is undefined by default
    expect(state.getShape('text1').style.scale).toBe(1)

    // Transform the shape in order to change its point and scale

    state
      .select('text1')
      .movePointer([0, 0])
      .startSession(SessionType.Transform, TLBoundsCorner.TopLeft)
      .movePointer({ x: -100, y: -100, shiftKey: false, altKey: false })
      .completeSession()

    const scale = state.getShape('text1').style.scale
    const bounds = TLDR.getBounds(state.getShape('text1'))
    const center = Utils.getBoundsCenter(bounds)

    expect(scale).not.toBe(1)
    expect(Number.isNaN(scale)).toBe(false)

    // Reset the bounds

    state.resetBounds(['text1'])

    // The scale should be back to 1
    expect(state.getShape('text1').style.scale).toBe(1)
    // The centers should be the same
    expect(Utils.getBoundsCenter(TLDR.getBounds(state.getShape('text1')))).toStrictEqual(center)

    state.undo()

    // The scale should be what it was before
    expect(state.getShape('text1').style.scale).not.toBe(1)
    // The centers should be the same
    expect(Utils.getBoundsCenter(TLDR.getBounds(state.getShape('text1')))).toStrictEqual(center)

    state.redo()

    // The scale should be back to 1
    expect(state.getShape('text1').style.scale).toBe(1)
    // The centers should be the same
    expect(Utils.getBoundsCenter(TLDR.getBounds(state.getShape('text1')))).toStrictEqual(center)
  })
})
