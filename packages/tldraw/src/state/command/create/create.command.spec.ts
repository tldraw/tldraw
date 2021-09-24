import { TLDrawState } from '~state'
import { mockDocument } from '~test'

describe('Create command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument)
  })

  describe('when no shape is provided', () => {
    it('does nothing', () => {
      const initialState = tlstate.state
      tlstate.create()

      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    const shape = { ...tlstate.getShape('rect1'), id: 'rect4' }
    tlstate.create([shape])

    expect(tlstate.getShape('rect4')).toBeTruthy()

    tlstate.undo()

    expect(tlstate.getShape('rect4')).toBe(undefined)

    tlstate.redo()

    expect(tlstate.getShape('rect4')).toBeTruthy()
  })

  it.todo('Creates bindings')
})
