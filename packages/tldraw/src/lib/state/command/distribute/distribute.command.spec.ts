import { DistributeType } from '@tldraw/core'
import { TLDrawState } from '../../tlstate'
import { mockDocument } from '../../test-helpers'

describe('Style command', () => {
  const tlstate = new TLDrawState()
  tlstate.loadDocument(mockDocument)
  tlstate.selectAll()

  it('does, undoes and redoes command', () => {
    tlstate.distribute(DistributeType.Horizontal)

    expect(tlstate.getShape('rect3').point).toEqual([50, 20])

    tlstate.undo()

    expect(tlstate.getShape('rect3').point).toEqual([20, 20])

    tlstate.redo()

    expect(tlstate.getShape('rect3').point).toEqual([50, 20])
  })

  it('distributes vertically', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.selectAll()
    tlstate.distribute(DistributeType.Vertical)
    expect(tlstate.getShape('rect3').point).toEqual([20, 50])
  })
})
