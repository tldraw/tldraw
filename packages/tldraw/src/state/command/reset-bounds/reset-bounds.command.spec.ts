import { TLBoundsCorner, Utils } from '@tldraw/core'
import { TLDrawState } from '~state'
import { TLDR } from '~state/tldr'
import { mockDocument } from '~test'
import { TLDrawShapeType } from '~types'

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
      .startTransformSession([0, 0], TLBoundsCorner.TopLeft)
      .updateTransformSession([-100, -100], false, false)
      .completeSession()

    const scale = tlstate.getShape('text1').style.scale
    const bounds = TLDR.getBounds(tlstate.getShape('text1'))
    const center = Utils.getBoundsCenter(bounds)

    expect(scale).not.toBe(1)
    expect(Number.isNaN(scale)).toBe(false)

    // Reset the bounds

    tlstate.resetBounds(['text1'])

    const newScale = tlstate.getShape('text1').style.scale
    const newBounds = TLDR.getBounds(tlstate.getShape('text1'))
    const newCenter = Utils.getBoundsCenter(newBounds)

    console.log(newScale)

    expect(newScale).toBe(1)

    expect(newCenter).toStrictEqual(center) // The centers should be the same

    tlstate.undo()

    tlstate.redo()
  })
})
