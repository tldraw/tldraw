import { TLDrawState } from '~state'
import { mockDocument } from '~test'

describe('Rotate command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = tlstate.state
      tlstate.rotate()
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    tlstate.select('rect1')

    expect(tlstate.getShape('rect1').rotation).toBe(undefined)

    tlstate.rotate()

    expect(tlstate.getShape('rect1').rotation).toBe(Math.PI * (6 / 4))

    tlstate.undo()

    expect(tlstate.getShape('rect1').rotation).toBe(undefined)

    tlstate.redo()

    expect(tlstate.getShape('rect1').rotation).toBe(Math.PI * (6 / 4))
  })

  it.todo('Rotates several shapes at once.')

  it.todo('Rotates shapes with handles.')
})

describe('when running the command', () => {
  it('restores selection on undo', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .select('rect1')
      .rotate()
      .deselectAll()
      .undo()

    expect(tlstate.selectedIds).toEqual(['rect1'])

    tlstate.deselectAll().redo()

    expect(tlstate.selectedIds).toEqual(['rect1'])
  })
})
