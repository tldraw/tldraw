import { TLDR } from '~state/tldr'
import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { ArrowShape, Decoration, TLDrawShape } from '~types'

describe('Toggle decoration command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = tlstate.state
      tlstate.toggleDecoration('start')
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  describe('when handle id is invalid', () => {
    it('does nothing', () => {
      const initialState = tlstate.state
      tlstate.toggleDecoration('invalid')
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    tlstate
      .create(
        TLDR.getShapeUtils({ type: 'arrow' } as TLDrawShape).create({
          id: 'arrow1',
          parentId: 'page1',
        })
      )
      .select('arrow1')

    expect(tlstate.getShape<ArrowShape>('arrow1').decorations?.end).toBe(Decoration.Arrow)

    tlstate.toggleDecoration('end')

    expect(tlstate.getShape<ArrowShape>('arrow1').decorations?.end).toBe(undefined)

    tlstate.undo()

    expect(tlstate.getShape<ArrowShape>('arrow1').decorations?.end).toBe(Decoration.Arrow)

    tlstate.redo()

    expect(tlstate.getShape<ArrowShape>('arrow1').decorations?.end).toBe(undefined)
  })
})
