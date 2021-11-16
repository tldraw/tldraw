import { StretchType, RectangleShape, TldrawShapeType } from '~types'
import { mockDocument, TldrawTestApp } from '~test'

describe('Stretch command', () => {
  const state = new TldrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  describe('when less than two shapes are selected', () => {
    it('does nothing', () => {
      state.select('rect2')
      const initialState = state.state
      state.stretch(StretchType.Horizontal)
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    state.select('rect1', 'rect2')
    state.stretch(StretchType.Horizontal)

    expect(state.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(state.getShape<RectangleShape>('rect1').size).toStrictEqual([200, 100])
    expect(state.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
    expect(state.getShape<RectangleShape>('rect2').size).toStrictEqual([200, 100])

    state.undo()

    expect(state.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(state.getShape<RectangleShape>('rect1').size).toStrictEqual([100, 100])
    expect(state.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 100])
    expect(state.getShape<RectangleShape>('rect2').size).toStrictEqual([100, 100])

    state.redo()

    expect(state.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(state.getShape<RectangleShape>('rect1').size).toStrictEqual([200, 100])
    expect(state.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
    expect(state.getShape<RectangleShape>('rect2').size).toStrictEqual([200, 100])
  })

  it('stretches horizontally', () => {
    state.select('rect1', 'rect2')
    state.stretch(StretchType.Horizontal)

    expect(state.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(state.getShape<RectangleShape>('rect1').size).toStrictEqual([200, 100])
    expect(state.getShape<RectangleShape>('rect2').point).toStrictEqual([0, 100])
    expect(state.getShape<RectangleShape>('rect2').size).toStrictEqual([200, 100])
  })

  it('stretches vertically', () => {
    state.select('rect1', 'rect2')
    state.stretch(StretchType.Vertical)

    expect(state.getShape<RectangleShape>('rect1').point).toStrictEqual([0, 0])
    expect(state.getShape<RectangleShape>('rect1').size).toStrictEqual([100, 200])
    expect(state.getShape<RectangleShape>('rect2').point).toStrictEqual([100, 0])
    expect(state.getShape<RectangleShape>('rect2').size).toStrictEqual([100, 200])
  })
})

describe('when running the command', () => {
  it('restores selection on undo', () => {
    const state = new TldrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .stretch(StretchType.Horizontal)
      .selectNone()
      .undo()

    expect(state.selectedIds).toEqual(['rect1', 'rect2'])

    state.selectNone().redo()

    expect(state.selectedIds).toEqual(['rect1', 'rect2'])
  })
})

describe('when stretching groups', () => {
  it('stretches children', () => {
    new TldrawTestApp()
      .createShapes(
        { id: 'rect1', type: TldrawShapeType.Rectangle, point: [0, 0], size: [100, 100] },
        { id: 'rect2', type: TldrawShapeType.Rectangle, point: [100, 100], size: [100, 100] },
        { id: 'rect3', type: TldrawShapeType.Rectangle, point: [200, 200], size: [100, 100] }
      )
      .group(['rect1', 'rect2'], 'groupA')
      .selectAll()
      .stretch(StretchType.Vertical)
      .expectShapesToHaveProps({
        rect1: { point: [0, 0], size: [100, 300] },
        rect2: { point: [100, 0], size: [100, 300] },
        rect3: { point: [200, 0], size: [100, 300] },
      })
  })
})
