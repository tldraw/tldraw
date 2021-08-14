import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import type { RectangleShape } from '~types'

describe('Stretch command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect1', 'rect2')
    tlstate.flipHorizontal()

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])

    tlstate.undo()

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])

    tlstate.redo()

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])
  })

  it('flips horizontally', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect1', 'rect2')
    tlstate.flipHorizontal()

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([100, 0])
  })

  it('distributes vertically', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect1', 'rect2')
    tlstate.flipVertical()

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 100])
  })
})
