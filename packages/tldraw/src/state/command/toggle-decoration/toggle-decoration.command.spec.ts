import { TLDR } from '~state/tldr'
import { TLDrawState } from '~state'
import { mockDocument } from '~state/test-helpers'
import { ArrowShape, Decoration, TLDrawShape } from '~types'

describe('Handle command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate
      .loadDocument(mockDocument)
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
