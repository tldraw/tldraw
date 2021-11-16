import { TLDR } from '~state/TLDR'
import { mockDocument, TldrawTestApp } from '~test'
import { SizeStyle, TldrawShapeType } from '~types'

describe('Style command', () => {
  it('does, undoes and redoes command', () => {
    const state = new TldrawTestApp().loadDocument(mockDocument).select('rect1')
    expect(state.getShape('rect1').style.size).toEqual(SizeStyle.Medium)

    state.style({ size: SizeStyle.Small })

    expect(state.getShape('rect1').style.size).toEqual(SizeStyle.Small)

    state.undo()

    expect(state.getShape('rect1').style.size).toEqual(SizeStyle.Medium)

    state.redo()

    expect(state.getShape('rect1').style.size).toEqual(SizeStyle.Small)
  })

  describe('When styling groups', () => {
    it('applies style to all group children', () => {
      const state = new TldrawTestApp()
      state
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .select('groupA')
        .style({ size: SizeStyle.Small })

      expect(state.getShape('rect1').style.size).toEqual(SizeStyle.Small)
      expect(state.getShape('rect2').style.size).toEqual(SizeStyle.Small)

      state.undo()

      expect(state.getShape('rect1').style.size).toEqual(SizeStyle.Medium)
      expect(state.getShape('rect2').style.size).toEqual(SizeStyle.Medium)

      state.redo()

      expect(state.getShape('rect1').style.size).toEqual(SizeStyle.Small)
      expect(state.getShape('rect2').style.size).toEqual(SizeStyle.Small)
    })
  })

  describe('When styling text', () => {
    it('recenters the shape if the size changed', () => {
      const state = new TldrawTestApp().createShapes({
        id: 'text1',
        type: TldrawShapeType.Text,
        text: 'Hello world',
      })

      const centerA = TLDR.getShapeUtils(TldrawShapeType.Text).getCenter(state.getShape('text1'))

      state.select('text1').style({ size: SizeStyle.Large })

      const centerB = TLDR.getShapeUtils(TldrawShapeType.Text).getCenter(state.getShape('text1'))

      state.style({ size: SizeStyle.Small })

      const centerC = TLDR.getShapeUtils(TldrawShapeType.Text).getCenter(state.getShape('text1'))

      state.style({ size: SizeStyle.Medium })

      const centerD = TLDR.getShapeUtils(TldrawShapeType.Text).getCenter(state.getShape('text1'))

      expect(centerA).toEqual(centerB)
      expect(centerA).toEqual(centerC)
      expect(centerB).toEqual(centerD)
    })
  })
})

describe('when running the command', () => {
  it('restores selection on undo', () => {
    const state = new TldrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1')
      .style({ size: SizeStyle.Small })
      .selectNone()
      .undo()

    expect(state.selectedIds).toEqual(['rect1'])

    state.selectNone().redo()

    expect(state.selectedIds).toEqual(['rect1'])
  })
})
