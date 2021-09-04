import { TLDrawState } from '~state'
import { mockDocument } from '~test'

describe('Delete page', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(mockDocument)

    const initialId = tlstate.currentPageId

    tlstate.createPage()

    const nextId = tlstate.currentPageId

    tlstate.deletePage()

    expect(tlstate.currentPageId).toBe(initialId)

    tlstate.undo()

    expect(tlstate.currentPageId).toBe(nextId)

    tlstate.redo()

    expect(tlstate.currentPageId).toBe(initialId)
  })
})
