import { StretchType, RectangleShape, TLDrawShapeType } from '~types'
import { TLDrawState } from '~state'
import { mockDocument, TLDrawStateUtils } from '~test'
import Vec from '@tldraw/vec'

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
      .selectNone()
      .undo()

    expect(tlstate.selectedIds).toEqual(['rect1', 'rect2'])

    tlstate.selectNone().redo()

    expect(tlstate.selectedIds).toEqual(['rect1', 'rect2'])
  })
})

describe('when stretching groups', () => {
  it('stretches children', () => {
    const tlstate = new TLDrawState()
      .createShapes(
        { id: 'rect1', type: TLDrawShapeType.Rectangle, point: [0, 0], size: [100, 100] },
        { id: 'rect2', type: TLDrawShapeType.Rectangle, point: [100, 100], size: [100, 100] },
        { id: 'rect3', type: TLDrawShapeType.Rectangle, point: [200, 200], size: [100, 100] }
      )
      .group(['rect1', 'rect2'], 'groupA')
      .selectAll()
      .stretch(StretchType.Vertical)

    new TLDrawStateUtils(tlstate).expectShapesToHaveProps({
      rect1: { point: [0, 0], size: [100, 300] },
      rect2: { point: [100, 0], size: [100, 300] },
      rect3: { point: [200, 0], size: [100, 300] },
    })
  })
})
