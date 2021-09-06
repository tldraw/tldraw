import { TLDrawState } from '~state'
import { mockDocument } from '~test'

describe('Delete page', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument)
  })

  describe('when there are no pages in the current document', () => {
    it('does nothing', () => {
      tlstate.resetDocument()
      const initialState = tlstate.state
      tlstate.deletePage('page1')
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
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
