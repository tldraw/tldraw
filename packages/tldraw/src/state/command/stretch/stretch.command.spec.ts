import { StretchType, RectangleShape } from '~types'
import { TLDrawState } from '~state'
import { mockDocument } from '~test'

describe('Stretch command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument)
  })

  describe('when less than two shapes are selected', () => {
    it('does nothing', () => {
      tlstate.select('rect2')
      const initialState = tlstate.state
      tlstate.stretch(StretchType.Horizontal)
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
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

  it('stretches horizontally', () => {
    tlstate.select('rect1', 'rect2')
    tlstate.stretch(StretchType.Horizontal)

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(tlstate.getShape<RectangleShape>('rect1').size).toStrictEqual([200, 100])
    expect(tlstate.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
    expect(tlstate.getShape<RectangleShape>('rect2').size).toStrictEqual([200, 100])
  })

  it('stretches vertically', () => {
    tlstate.select('rect1', 'rect2')
    tlstate.stretch(StretchType.Vertical)

    expect(tlstate.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(tlstate.getShape<RectangleShape>('rect1').size).toStrictEqual([100, 200])
    expect(tlstate.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 0])
    expect(tlstate.getShape<RectangleShape>('rect2').size).toStrictEqual([100, 200])
  })
})

describe('when running the command', () => {
  it('restores selection on undo', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .stretch(StretchType.Horizontal)
      .deselectAll()
      .undo()

    expect(tlstate.selectedIds).toEqual(['rect1', 'rect2'])

    tlstate.deselectAll().redo()

    expect(tlstate.selectedIds).toEqual(['rect1', 'rect2'])
  })
})
