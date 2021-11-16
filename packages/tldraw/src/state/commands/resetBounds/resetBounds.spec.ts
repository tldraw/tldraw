import { TLBoundsCorner, Utils } from '@tldraw/core'
import { TLDR } from '~state/TLDR'
import { mockDocument, TldrawTestApp } from '~test'
import { SessionType, TDShapeType } from '~types'

describe('Reset bounds command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  it('does, undoes and redoes command', () => {
    app.createShapes({
      id: 'text1',
      type: TDShapeType.Text,
      point: [0, 0],
      text: 'Hello World',
    })

    // Scale is undefined by default
    expect(app.getShape('text1').style.scale).toBe(1)

    // Transform the shape in order to change its point and scale

    app
      .select('text1')
      .movePointer([0, 0])
      .startSession(SessionType.Transform, TLBoundsCorner.TopLeft)
      .movePointer({ x: -100, y: -100, shiftKey: false, altKey: false })
      .completeSession()

    const scale = app.getShape('text1').style.scale
    const bounds = TLDR.getBounds(app.getShape('text1'))
    const center = Utils.getBoundsCenter(bounds)

    expect(scale).not.toBe(1)
    expect(Number.isNaN(scale)).toBe(false)

    // Reset the bounds

    app.resetBounds(['text1'])

    // The scale should be back to 1
    expect(app.getShape('text1').style.scale).toBe(1)
    // The centers should be the same
    expect(Utils.getBoundsCenter(TLDR.getBounds(app.getShape('text1')))).toStrictEqual(center)

    app.undo()

    // The scale should be what it was before
    expect(app.getShape('text1').style.scale).not.toBe(1)
    // The centers should be the same
    expect(Utils.getBoundsCenter(TLDR.getBounds(app.getShape('text1')))).toStrictEqual(center)

    app.redo()

    // The scale should be back to 1
    expect(app.getShape('text1').style.scale).toBe(1)
    // The centers should be the same
    expect(Utils.getBoundsCenter(TLDR.getBounds(app.getShape('text1')))).toStrictEqual(center)
  })
})
