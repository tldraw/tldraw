import { StretchType } from '../../../types'
import { TLDrawState } from '../../tlstate'
import { mockDocument } from '../../test-helpers'
import { RectangleShape } from '../../../shape'

describe('Stretch command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect1', 'rect2')
    tlstate.stretch(StretchType.Horizontal)

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(tlstate.getShape<RectangleShape>('rect1').size).toStrictEqual([200, 100])
    expect(tlstate.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
    expect(tlstate.getShape<RectangleShape>('rect2').size).toStrictEqual([200, 100])

    tlstate.undo()

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(tlstate.getShape<RectangleShape>('rect1').size).toStrictEqual([100, 100])
    expect(tlstate.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 100])
    expect(tlstate.getShape<RectangleShape>('rect2').size).toStrictEqual([100, 100])

    tlstate.redo()

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(tlstate.getShape<RectangleShape>('rect1').size).toStrictEqual([200, 100])
    expect(tlstate.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
    expect(tlstate.getShape<RectangleShape>('rect2').size).toStrictEqual([200, 100])
  })

  it('distributes horizontally', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect1', 'rect2')
    tlstate.stretch(StretchType.Horizontal)

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(tlstate.getShape<RectangleShape>('rect1').size).toStrictEqual([200, 100])
    expect(tlstate.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
    expect(tlstate.getShape<RectangleShape>('rect2').size).toStrictEqual([200, 100])
  })

  it('distributes vertically', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect1', 'rect2')
    tlstate.stretch(StretchType.Vertical)

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(tlstate.getShape<RectangleShape>('rect1').size).toStrictEqual([100, 200])
    expect(tlstate.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 0])
    expect(tlstate.getShape<RectangleShape>('rect2').size).toStrictEqual([100, 200])
  })
})
