import { TLBoundsCorner, Utils } from '@tldraw/core'
import { TLDrawState } from '~state'
import { TLDR } from '~state/TLDR'
import { mockDocument } from '~test'
import { SessionType, TLDrawShapeType } from '~types'

describe('Reset bounds command', () => {
  const state = new TLDrawState()

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
    expect(state.getShape('text1').style.scale).toBeUndefined()

    // Transform the shape in order to change its point and scale

    state
      .select('text1')
      .startSession(SessionType.Transform, [0, 0], TLBoundsCorner.TopLeft)
      .updateSession([-100, -100], false, false)
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
