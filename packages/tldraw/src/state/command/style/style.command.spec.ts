import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { SizeStyle } from '~types'

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
})
