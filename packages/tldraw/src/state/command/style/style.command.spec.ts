import { TLDrawState } from '~state'
import { TLDR } from '~state/tldr'
import { mockDocument } from '~test'
import { SizeStyle, TLDrawShapeType } from '~types'

describe('Style command', () => {
  const tlstate = new TLDrawState()
  tlstate.loadDocument(mockDocument)
  tlstate.select('rect1')

  it('does, undoes and redoes command', () => {
    expect(tlstate.getShape('rect1').style.size).toEqual(SizeStyle.Medium)

    tlstate.style({ size: SizeStyle.Small })

    expect(tlstate.getShape('rect1').style.size).toEqual(SizeStyle.Small)

    tlstate.undo()

    expect(tlstate.getShape('rect1').style.size).toEqual(SizeStyle.Medium)

    tlstate.redo()

    expect(tlstate.getShape('rect1').style.size).toEqual(SizeStyle.Small)
  })

  describe('When styling groups', () => {
    it('applies style to all group children', () => {
      const tlstate = new TLDrawState()
      tlstate
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .select('groupA')
        .style({ size: SizeStyle.Small })

      expect(tlstate.getShape('rect1').style.size).toEqual(SizeStyle.Small)
      expect(tlstate.getShape('rect2').style.size).toEqual(SizeStyle.Small)

      tlstate.undo()

      expect(tlstate.getShape('rect1').style.size).toEqual(SizeStyle.Medium)
      expect(tlstate.getShape('rect2').style.size).toEqual(SizeStyle.Medium)

      tlstate.redo()

      expect(tlstate.getShape('rect1').style.size).toEqual(SizeStyle.Small)
      expect(tlstate.getShape('rect2').style.size).toEqual(SizeStyle.Small)
    })
  })

  describe('When styling text', () => {
    it('recenters the shape if the size changed', () => {
      const tlstate = new TLDrawState().createShapes({
        id: 'text1',
        type: TLDrawShapeType.Text,
        text: 'Hello world',
      })

      const centerA = TLDR.getShapeUtils(TLDrawShapeType.Text).getCenter(tlstate.getShape('text1'))

      tlstate.select('text1').style({ size: SizeStyle.Large })

      const centerB = TLDR.getShapeUtils(TLDrawShapeType.Text).getCenter(tlstate.getShape('text1'))

      tlstate.style({ size: SizeStyle.Small })

      const centerC = TLDR.getShapeUtils(TLDrawShapeType.Text).getCenter(tlstate.getShape('text1'))

      tlstate.style({ size: SizeStyle.Medium })

      const centerD = TLDR.getShapeUtils(TLDrawShapeType.Text).getCenter(tlstate.getShape('text1'))

      expect(centerA).toEqual(centerB)
      expect(centerA).toEqual(centerC)
      expect(centerB).toEqual(centerD)
    })
  })
})
