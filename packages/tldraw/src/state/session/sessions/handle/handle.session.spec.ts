import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { TLDR } from '~state/tldr'
import type { TLDrawShape } from '~types'

describe('Handle session', () => {
  const tlstate = new TLDrawState()

  it('begins, updates and completes session', () => {
    tlstate
      .loadDocument(mockDocument)
      .create(
        TLDR.getShapeUtils({ type: 'arrow' } as TLDrawShape).create({
          id: 'arrow1',
          parentId: 'page1',
        })
      )
      .select('arrow1')
      .startHandleSession([-10, -10], 'end')
      .updateHandleSession([10, 10])
      .completeSession()
      .undo()
      .redo()
  })

  it('cancels session', () => {
    tlstate
      .loadDocument(mockDocument)
      .create({
        ...TLDR.getShapeUtils({ type: 'arrow' } as TLDrawShape).defaultProps,
        id: 'arrow1',
        parentId: 'page1',
      })
      .select('arrow1')
      .startHandleSession([-10, -10], 'end')
      .updateHandleSession([10, 10])
      .cancelSession()

    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
  })
})
