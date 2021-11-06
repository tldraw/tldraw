import { TLDrawState } from '~state'
import { mockDocument } from '~test'

describe('Update command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = tlstate.state
      tlstate.updateShapes()
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    tlstate.updateShapes({ id: 'rect1', point: [100, 100] })

    expect(tlstate.getShape('rect1').point).toStrictEqual([100, 100])

    tlstate.undo()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])

    tlstate.redo()

    expect(tlstate.getShape('rect1').point).toStrictEqual([100, 100])
  })
})
