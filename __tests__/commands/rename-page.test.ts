import TestState from '../test-utils'

describe('rename page command', () => {
  const tt = new TestState()
  tt.resetDocumentState().save()

  describe('renames a page', () => {
    it('does, undoes, and redoes command', () => {
      tt.restore().reset().send('CREATED_PAGE')

      const pageId = Object.keys(tt.data.document.pages)[1]

      expect(tt.data.document.pages[pageId].name).toBe('Page 2')

      tt.send('RENAMED_PAGE', { id: pageId, name: 'My First Page' })

      expect(tt.data.document.pages[pageId].name).toBe('My First Page')

      tt.undo()

      expect(tt.data.document.pages[pageId].name).toBe('Page 2')

      tt.redo()

      expect(tt.data.document.pages[pageId].name).toBe('My First Page')
    })
  })

  // describe('renames a page other than the current page', () => {
  //   tt.restore()
  //     .reset()
  //     .send('CREATED_PAGE')
  //     .send('CHANGED_PAGE', { id: 'page1' })

  //   expect(Object.keys(tt.data.document.pages).length).toBe(2)

  //   expect(tt.data.currentPageId).toBe('page1')

  //   const secondPageId = Object.keys(tt.data.document.pages)[1]

  //   expect(tt.data.document.pages[secondPageId].name).toBe('New Page')

  //   tt.send('RENAMED_PAGE', { id: secondPageId, name: 'My Second Page' })

  //   expect(tt.data.document.pages[secondPageId].name).toBe('My Second Page')

  //   tt.undo()

  //   expect(tt.data.document.pages[secondPageId].name).toBe('New Page')

  //   tt.redo()

  //   expect(tt.data.document.pages[secondPageId].name).toBe('My Second Page')
  // })
})
