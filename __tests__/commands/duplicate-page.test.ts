import { ShapeType } from 'types'
import TestState from '../test-utils'

describe('duplicate page command', () => {
  const tt = new TestState()
  tt.resetDocumentState()
    .createShape(
      {
        type: ShapeType.Rectangle,
        point: [0, 0],
        size: [100, 100],
        childIndex: 1,
      },
      'rect1'
    )
    .save()

  describe('duplicates a page', () => {
    it('does, undoes, and redoes command', () => {
      tt.restore()

      expect(Object.keys(tt.data.document.pages).length).toBe(1)
      const pageId = Object.keys(tt.data.document.pages)[0]
      expect(tt.getShape('rect1').parentId).toBe(pageId)

      tt.send('DUPLICATED_PAGE', { id: pageId })

      expect(Object.keys(tt.data.document.pages).length).toBe(2)

      const newPageId = Object.keys(tt.data.document.pages)[1]

      expect(tt.data.currentPageId).toBe(newPageId)

      expect(tt.getShape('rect1').parentId).toBe(newPageId)

      tt.undo()

      expect(Object.keys(tt.data.document.pages).length).toBe(1)
      expect(tt.data.currentPageId).toBe(Object.keys(tt.data.document.pages)[0])

      expect(tt.getShape('rect1').parentId).toBe(pageId)

      tt.redo()

      expect(Object.keys(tt.data.document.pages).length).toBe(2)
      expect(tt.data.currentPageId).toBe(Object.keys(tt.data.document.pages)[1])

      expect(tt.getShape('rect1').parentId).toBe(newPageId)
    })
  })

  describe('duplicates a page other than the current page', () => {
    tt.restore()
      .reset()
      .send('CREATED_PAGE')
      .createShape(
        {
          type: ShapeType.Rectangle,
          point: [0, 0],
          size: [100, 100],
          childIndex: 1,
        },
        'rect2'
      )
      .send('CHANGED_PAGE', { id: 'page1' })

    const firstPageId = Object.keys(tt.data.document.pages)[0]

    // We should be back on the first page
    expect(tt.data.currentPageId).toBe(firstPageId)

    // But we should have two pages
    expect(Object.keys(tt.data.document.pages).length).toBe(2)

    const secondPageId = Object.keys(tt.data.document.pages)[1]

    // Now we duplicate the second page
    tt.send('DUPLICATED_PAGE', { id: secondPageId })

    // We should now have three pages
    expect(Object.keys(tt.data.document.pages).length).toBe(3)

    // The third page should also have a shape named rect2
    const thirdPageId = Object.keys(tt.data.document.pages)[2]

    // We should have changed pages to the third page
    expect(tt.data.currentPageId).toBe(thirdPageId)

    // And it should be the parent of the third page
    expect(tt.getShape('rect2').parentId).toBe(thirdPageId)

    tt.undo()

    // We should still be on the first page, but we should
    // have only two pages; the third page should be deleted
    expect(Object.keys(tt.data.document.pages).length).toBe(2)
    expect(tt.data.document.pages[thirdPageId]).toBe(undefined)
    expect(tt.data.currentPageId).toBe(firstPageId)

    tt.redo()

    // We should be back on the third page
    expect(Object.keys(tt.data.document.pages).length).toBe(3)
    expect(tt.data.document.pages[thirdPageId]).toBeTruthy()
    expect(tt.data.currentPageId).toBe(Object.keys(tt.data.document.pages)[2])

    expect(tt.getShape('rect2').parentId).toBe(thirdPageId)
  })
})
