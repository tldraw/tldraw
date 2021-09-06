import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { DistributeType } from '~types'

describe('Distribute command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument)
  })

  describe('when less than three shapes are selected', () => {
    it('does nothing', () => {
      tlstate.select('rect1', 'rect2')
      const initialState = tlstate.state
      tlstate.distribute(DistributeType.Horizontal)
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    tlstate.selectAll()
    tlstate.distribute(DistributeType.Horizontal)

    expect(tlstate.getShape('rect3').point).toEqual([50, 20])
    tlstate.undo()
    expect(tlstate.getShape('rect3').point).toEqual([20, 20])
    tlstate.redo()
    expect(tlstate.getShape('rect3').point).toEqual([50, 20])
  })

  it('distributes vertically', () => {
    tlstate.selectAll()
    tlstate.distribute(DistributeType.Vertical)

    expect(tlstate.getShape('rect3').point).toEqual([20, 50])
  })
})
