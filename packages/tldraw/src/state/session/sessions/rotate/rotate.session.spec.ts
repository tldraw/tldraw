import { TLDrawState } from '~state'
import { mockDocument } from '~test'

describe('Brush session', () => {
  const tlstate = new TLDrawState()

  it('begins, updates and completes session', () => {
    tlstate.loadDocument(mockDocument)

    expect(tlstate.getShape('rect1').rotation).toBe(undefined)

    tlstate
      .select('rect1')
      .startTransformSession([50, 0], 'rotate')
      .updateTransformSession([100, 50])

    expect(tlstate.getShape('rect1').rotation).toBe(Math.PI / 2)

    tlstate.updateTransformSession([50, 100])

    expect(tlstate.getShape('rect1').rotation).toBe(Math.PI)

    tlstate.updateTransformSession([0, 50])

    expect(tlstate.getShape('rect1').rotation).toBe((Math.PI * 3) / 2)

    tlstate.updateTransformSession([50, 0])

    expect(tlstate.getShape('rect1').rotation).toBe(0)

    tlstate.updateTransformSession([0, 50])

    expect(tlstate.getShape('rect1').rotation).toBe((Math.PI * 3) / 2)

    tlstate.completeSession()

    tlstate.undo()

    expect(tlstate.getShape('rect1').rotation).toBe(undefined)

    tlstate.redo()

    expect(tlstate.getShape('rect1').rotation).toBe((Math.PI * 3) / 2)
  })

  it('cancels session', () => {
    tlstate
      .loadDocument(mockDocument)
      .select('rect1')
      .startTransformSession([50, 0], 'rotate')
      .updateTransformSession([100, 50])
      .cancel()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
  })
})
