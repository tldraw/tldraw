import { TLDrawState } from '../../tlstate'
import { mockDocument } from '../../test-helpers'
import { AlignType } from '../../../types'

describe('Align command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.selectAll()
    tlstate.align(AlignType.Top)

    expect(tlstate.getShape('rect2').point).toEqual([100, 0])

    tlstate.undo()

    expect(tlstate.getShape('rect2').point).toEqual([100, 100])

    tlstate.redo()

    expect(tlstate.getShape('rect2').point).toEqual([100, 0])
  })

  it('aligns left', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.selectAll()
    tlstate.align(AlignType.Top)

    expect(tlstate.getShape('rect2').point).toEqual([100, 0])
  })

  it('aligns right', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.selectAll()
    tlstate.align(AlignType.Right)

    expect(tlstate.getShape('rect1').point).toEqual([100, 0])
  })

  it('aligns bottom', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.selectAll()
    tlstate.align(AlignType.Bottom)

    expect(tlstate.getShape('rect1').point).toEqual([0, 100])
  })

  it('aligns left', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.selectAll()
    tlstate.align(AlignType.Left)

    expect(tlstate.getShape('rect2').point).toEqual([0, 100])
  })

  it('aligns center horizontal', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.selectAll()
    tlstate.align(AlignType.CenterHorizontal)

    expect(tlstate.getShape('rect1').point).toEqual([50, 0])
    expect(tlstate.getShape('rect2').point).toEqual([50, 100])
  })

  it('aligns center vertical', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.selectAll()
    tlstate.align(AlignType.CenterVertical)

    expect(tlstate.getShape('rect1').point).toEqual([0, 50])
    expect(tlstate.getShape('rect2').point).toEqual([100, 50])
  })
})
