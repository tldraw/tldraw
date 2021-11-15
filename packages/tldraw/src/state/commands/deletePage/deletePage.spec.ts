import { mockDocument, TLDrawTestApp } from '~test'

describe('Delete page', () => {
  const state = new TLDrawTestApp()

  beforeEach(() => {
    state.loadDocument(mockDocument)
  })

  describe('when there are no pages in the current document', () => {
    it('does nothing', () => {
      state.resetDocument()
      const initialState = state.state
      state.deletePage('page1')
      const currentState = state.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    const initialId = state.currentPageId

    state.createPage()

    const nextId = state.currentPageId

    state.deletePage()

    expect(state.currentPageId).toBe(initialId)

    state.undo()

    expect(state.currentPageId).toBe(nextId)

    state.redo()

    expect(state.currentPageId).toBe(initialId)
  })
})
