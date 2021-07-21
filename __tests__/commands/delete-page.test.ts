import TestState from '../test-utils'

describe('delete page command', () => {
  const tt = new TestState()
  tt.resetDocumentState().save()

  it('does command', () => {
    tt.reset().restore().send('CREATED_PAGE')
    expect(Object.keys(tt.data.document.pages).length).toBe(2)

    const pageId = Object.keys(tt.data.document.pages)[1]
    tt.send('DELETED_PAGE', { id: pageId })

    expect(Object.keys(tt.data.document.pages).length).toBe(1)

    const firstPageId = Object.keys(tt.data.document.pages)[0]
    expect(tt.data.currentPageId).toBe(firstPageId)
  })

  it('un-does command', () => {
    tt.reset().restore().send('CREATED_PAGE')
    expect(Object.keys(tt.data.document.pages).length).toBe(2)

    const pageId = Object.keys(tt.data.document.pages)[1]
    tt.send('DELETED_PAGE', { id: pageId }).undo()

    expect(Object.keys(tt.data.document.pages).length).toBe(2)

    expect(tt.data.currentPageId).toBe(pageId)
  })

  it('re-does command', () => {
    tt.reset().restore().send('CREATED_PAGE')
    expect(Object.keys(tt.data.document.pages).length).toBe(2)

    const pageId = Object.keys(tt.data.document.pages)[1]
    tt.send('DELETED_PAGE', { id: pageId }).undo().redo()

    expect(Object.keys(tt.data.document.pages).length).toBe(1)

    const firstPageId = Object.keys(tt.data.document.pages)[0]
    expect(tt.data.currentPageId).toBe(firstPageId)
  })

  describe('when first page is selected', () => {
    it('does command', () => {
      // TODO
      null
    })

    it('un-does command', () => {
      // TODO
      null
    })

    it('re-does command', () => {
      // TODO
      null
    })
  })

  describe('when project only has one page', () => {
    it('does command', () => {
      // TODO
      null
    })

    it('un-does command', () => {
      // TODO
      null
    })

    it('re-does command', () => {
      // TODO
      null
    })
  })
})
