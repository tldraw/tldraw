import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { AlignType } from '~types'

describe('Align command', () => {
  const tlstate = new TLDrawState()

  describe('when less than two shapes are selected', () => {
    it('does nothing', () => {
      tlstate.loadDocument(mockDocument).select('rect2')
      const initialState = tlstate.state
      tlstate.align(AlignType.Top)
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  describe('when multiple shapes are selected', () => {
    beforeEach(() => {
      tlstate.loadDocument(mockDocument)
      tlstate.selectAll()
    })

    it('does, undoes and redoes command', () => {
      tlstate.align(AlignType.Top)

      expect(tlstate.getShape('rect2').point).toEqual([100, 0])

      tlstate.undo()

      expect(tlstate.getShape('rect2').point).toEqual([100, 100])

      tlstate.redo()

      expect(tlstate.getShape('rect2').point).toEqual([100, 0])
    })

    it('aligns top', () => {
      tlstate.align(AlignType.Top)

      expect(tlstate.getShape('rect2').point).toEqual([100, 0])
    })

    it('aligns right', () => {
      tlstate.align(AlignType.Right)

      expect(tlstate.getShape('rect1').point).toEqual([100, 0])
    })

    it('aligns bottom', () => {
      tlstate.align(AlignType.Bottom)

      expect(tlstate.getShape('rect1').point).toEqual([0, 100])
    })

    it('aligns left', () => {
      tlstate.align(AlignType.Left)

      expect(tlstate.getShape('rect2').point).toEqual([0, 100])
    })

    it('aligns center horizontal', () => {
      tlstate.align(AlignType.CenterHorizontal)

      expect(tlstate.getShape('rect1').point).toEqual([50, 0])
      expect(tlstate.getShape('rect2').point).toEqual([50, 100])
    })

    it('aligns center vertical', () => {
      tlstate.align(AlignType.CenterVertical)

      expect(tlstate.getShape('rect1').point).toEqual([0, 50])
      expect(tlstate.getShape('rect2').point).toEqual([100, 50])
    })
  })
})
