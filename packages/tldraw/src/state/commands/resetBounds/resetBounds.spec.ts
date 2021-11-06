import { TLBoundsCorner, Utils } from '@tldraw/core'
import { TLDrawState } from '~state'
import { TLDR } from '~state/TLDR'
import { mockDocument } from '~test'
import { SessionType, TLDrawShapeType } from '~types'

describe('Reset bounds command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument)
  })

  it('does, undoes and redoes command', () => {
    tlstate.createShapes({
      id: 'text1',
      type: TLDrawShapeType.Text,
      point: [0, 0],
      text: 'Hello World',
    })

    // Scale is undefined by default
    expect(tlstate.getShape('text1').style.scale).toBeUndefined()

    // Transform the shape in order to change its point and scale

    tlstate
      .select('text1')
      .startSession(SessionType.Transform, [0, 0], TLBoundsCorner.TopLeft)
      .updateSession([-100, -100], false, false)
      .completeSession()

    const scale = tlstate.getShape('text1').style.scale
    const bounds = TLDR.getBounds(tlstate.getShape('text1'))
    const center = Utils.getBoundsCenter(bounds)

    expect(scale).not.toBe(1)
    expect(Number.isNaN(scale)).toBe(false)

    // Reset the bounds

    tlstate.resetBounds(['text1'])

    // The scale should be back to 1
    expect(tlstate.getShape('text1').style.scale).toBe(1)
    // The centers should be the same
    expect(Utils.getBoundsCenter(TLDR.getBounds(tlstate.getShape('text1')))).toStrictEqual(center)

    tlstate.undo()

    // The scale should be what it was before
    expect(tlstate.getShape('text1').style.scale).not.toBe(1)
    // The centers should be the same
    expect(Utils.getBoundsCenter(TLDR.getBounds(tlstate.getShape('text1')))).toStrictEqual(center)

    tlstate.redo()

    // The scale should be back to 1
    expect(tlstate.getShape('text1').style.scale).toBe(1)
    // The centers should be the same
    expect(Utils.getBoundsCenter(TLDR.getBounds(tlstate.getShape('text1')))).toStrictEqual(center)
  })
})
