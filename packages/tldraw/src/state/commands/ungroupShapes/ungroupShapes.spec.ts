/* eslint-disable @typescript-eslint/ban-ts-comment */
import { mockDocument, TldrawTestApp } from '~test'
import { GroupShape, TDShapeType } from '~types'

describe('Ungroup command', () => {
  const app = new TldrawTestApp()

  it('does, undoes and redoes command', () => {
    app.loadDocument(mockDocument).group(['rect1', 'rect2'], 'groupA').select('groupA').ungroup()

    expect(app.getShape<GroupShape>('groupA')).toBeUndefined()
    expect(app.getShape('rect1').parentId).toBe('page1')
    expect(app.getShape('rect2').parentId).toBe('page1')

    app.undo()

    expect(app.getShape<GroupShape>('groupA')).toBeDefined()
    expect(app.getShape<GroupShape>('groupA').children).toStrictEqual(['rect1', 'rect2'])
    expect(app.getShape('rect1').parentId).toBe('groupA')
    expect(app.getShape('rect2').parentId).toBe('groupA')

    app.redo()

    expect(app.getShape<GroupShape>('groupA')).toBeUndefined()
    expect(app.getShape('rect1').parentId).toBe('page1')
    expect(app.getShape('rect2').parentId).toBe('page1')
  })

  describe('When ungrouping', () => {
    it('Ungroups shapes on any page', () => {
      app
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .createPage('page2')
        .ungroup(['groupA'], 'page1')

      expect(app.getShape('groupA', 'page1')).toBeUndefined()
      app.undo()
      expect(app.getShape('groupA', 'page1')).toBeDefined()
    })

    it('Ungroups multiple selected groups', () => {
      app
        .loadDocument(mockDocument)
        .createShapes({
          id: 'rect4',
          type: TDShapeType.Rectangle,
        })
        .group(['rect1', 'rect2'], 'groupA')
        .group(['rect3', 'rect4'], 'groupB')
        .selectAll()
        .ungroup()

      expect(app.getShape('groupA', 'page1')).toBeUndefined()
      expect(app.getShape('groupB', 'page1')).toBeUndefined()
    })

    it('Does not ungroup if a group shape is not selected', () => {
      app.loadDocument(mockDocument).select('rect1')
      const before = app.state
      app.group()
      // State should not have changed
      expect(app.state).toStrictEqual(before)
    })

    it('Correctly selects children after ungrouping', () => {
      const app = new TldrawTestApp()
        .createShapes(
          {
            id: 'rect1',
            type: TDShapeType.Rectangle,
            childIndex: 1,
          },
          {
            id: 'rect2',
            type: TDShapeType.Rectangle,
            childIndex: 2,
          },
          {
            id: 'rect3',
            type: TDShapeType.Rectangle,
            childIndex: 3,
          }
        )
        .group(['rect1', 'rect2'], 'groupA')
        .selectAll()
        .ungroup()

      // State should not have changed
      expect(app.selectedIds).toStrictEqual(['rect3', 'rect1', 'rect2'])
    })

    it('Reparents shapes to the page at the correct childIndex', () => {
      const app = new TldrawTestApp()
        .createShapes(
          {
            id: 'rect1',
            type: TDShapeType.Rectangle,
            childIndex: 1,
          },
          {
            id: 'rect2',
            type: TDShapeType.Rectangle,
            childIndex: 2,
          },
          {
            id: 'rect3',
            type: TDShapeType.Rectangle,
            childIndex: 3,
          }
        )
        .group(['rect1', 'rect2'], 'groupA')

      const { childIndex } = app.getShape<GroupShape>('groupA')

      expect(childIndex).toBe(1)
      expect(app.getShape('rect1').childIndex).toBe(1)
      expect(app.getShape('rect2').childIndex).toBe(2)
      expect(app.getShape('rect3').childIndex).toBe(3)

      app.ungroup()

      expect(app.getShape('rect1').childIndex).toBe(1)
      expect(app.getShape('rect2').childIndex).toBe(2)
      expect(app.getShape('rect3').childIndex).toBe(3)
    })
    it.todo('Deletes any bindings to the group')
  })
})
