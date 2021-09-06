import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import type { RectangleShape } from '~types'

describe('Flip command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument)
  })

  it('does, undoes and redoes command', () => {
    tlstate.select('rect1', 'rect2')
    tlstate.flipHorizontal()

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])

    tlstate.undo()

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])

    tlstate.redo()

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])
  })

  it('flips horizontally', () => {
    tlstate.select('rect1', 'rect2')
    tlstate.flipHorizontal()

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])
  })

  it('flips vertically', () => {
    tlstate.select('rect1', 'rect2')
    tlstate.flipVertical()

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 100])
  })
})
