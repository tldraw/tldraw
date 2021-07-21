import TestState from '../test-utils'

describe('create page command', () => {
  const tt = new TestState()
  tt.resetDocumentState().save()

  describe('creates a page', () => {
    it('does command', () => {
      expect(Object.keys(tt.data.document.pages).length).toBe(1)

      tt.send('CREATED_PAGE')

      expect(Object.keys(tt.data.document.pages).length).toBe(2)
    })

    it('changes to the new page', () => {
      tt.restore().send('CREATED_PAGE')

      const pageId = Object.keys(tt.data.document.pages)[1]

      expect(tt.data.currentPageId).toBe(pageId)
    })

    it('un-does command', () => {
      tt.restore().send('CREATED_PAGE').undo()
      expect(Object.keys(tt.data.document.pages).length).toBe(1)
      const pageId = Object.keys(tt.data.document.pages)[0]
      expect(tt.data.currentPageId).toBe(pageId)
    })

    it('re-does command', () => {
      tt.restore().send('CREATED_PAGE').undo().redo()
      expect(Object.keys(tt.data.document.pages).length).toBe(2)
      const pageId = Object.keys(tt.data.document.pages)[1]
      expect(tt.data.currentPageId).toBe(pageId)
    })
  })
})
