import { mockDocument, TldrawTestApp } from '~test'

describe('Delete page', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  describe('when there are no pages in the current document', () => {
    it('does nothing', () => {
      app.resetDocument()
      const initialState = app.state
      app.deletePage('page1')
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    const initialId = app.currentPageId

    app.createPage()

    const nextId = app.currentPageId

    app.deletePage()

    expect(app.currentPageId).toBe(initialId)

    app.undo()

    expect(app.currentPageId).toBe(nextId)

    app.redo()

    expect(app.currentPageId).toBe(initialId)
  })
})
