/* eslint-disable @typescript-eslint/ban-ts-comment */
import { mockDocument, TldrawTestApp } from '~test'
import { GroupShape, TldrawShapeType } from '~types'

describe('Ungroup command', () => {
  const state = new TldrawTestApp()

  it('does, undoes and redoes command', () => {
    state.loadDocument(mockDocument).group(['rect1', 'rect2'], 'groupA').select('groupA').ungroup()

    expect(state.getShape<GroupShape>('groupA')).toBeUndefined()
    expect(state.getShape('rect1').parentId).toBe('page1')
    expect(state.getShape('rect2').parentId).toBe('page1')

    state.undo()

    expect(state.getShape<GroupShape>('groupA')).toBeDefined()
    expect(state.getShape<GroupShape>('groupA').children).toStrictEqual(['rect1', 'rect2'])
    expect(state.getShape('rect1').parentId).toBe('groupA')
    expect(state.getShape('rect2').parentId).toBe('groupA')

    state.redo()

    expect(state.getShape<GroupShape>('groupA')).toBeUndefined()
    expect(state.getShape('rect1').parentId).toBe('page1')
    expect(state.getShape('rect2').parentId).toBe('page1')
  })

  describe('When ungrouping', () => {
    it('Ungroups shapes on any page', () => {
      state
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .createPage('page2')
        .ungroup(['groupA'], 'page1')

      expect(state.getShape('groupA', 'page1')).toBeUndefined()
      state.undo()
      expect(state.getShape('groupA', 'page1')).toBeDefined()
    })

    it('Ungroups multiple selected groups', () => {
      state
        .loadDocument(mockDocument)
        .createShapes({
          id: 'rect4',
          type: TldrawShapeType.Rectangle,
        })
        .group(['rect1', 'rect2'], 'groupA')
        .group(['rect3', 'rect4'], 'groupB')
        .selectAll()
        .ungroup()

      expect(state.getShape('groupA', 'page1')).toBeUndefined()
      expect(state.getShape('groupB', 'page1')).toBeUndefined()
    })

    it('Does not ungroup if a group shape is not selected', () => {
      state.loadDocument(mockDocument).select('rect1')
      const before = state.state
      state.group()
      // State should not have changed
      expect(state.state).toStrictEqual(before)
    })

    it('Correctly selects children after ungrouping', () => {
      const state = new TldrawTestApp()
        .createShapes(
          {
            id: 'rect1',
            type: TldrawShapeType.Rectangle,
            childIndex: 1,
          },
          {
            id: 'rect2',
            type: TldrawShapeType.Rectangle,
            childIndex: 2,
          },
          {
            id: 'rect3',
            type: TldrawShapeType.Rectangle,
            childIndex: 3,
          }
        )
        .group(['rect1', 'rect2'], 'groupA')
        .selectAll()
        .ungroup()

      // State should not have changed
      expect(state.selectedIds).toStrictEqual(['rect3', 'rect1', 'rect2'])
    })

    it('Reparents shapes to the page at the correct childIndex', () => {
      const state = new TldrawTestApp()
        .createShapes(
          {
            id: 'rect1',
            type: TldrawShapeType.Rectangle,
            childIndex: 1,
          },
          {
            id: 'rect2',
            type: TldrawShapeType.Rectangle,
            childIndex: 2,
          },
          {
            id: 'rect3',
            type: TldrawShapeType.Rectangle,
            childIndex: 3,
          }
        )
        .group(['rect1', 'rect2'], 'groupA')

      const { childIndex } = state.getShape<GroupShape>('groupA')

      expect(childIndex).toBe(1)
      expect(state.getShape('rect1').childIndex).toBe(1)
      expect(state.getShape('rect2').childIndex).toBe(2)
      expect(state.getShape('rect3').childIndex).toBe(3)

      state.ungroup()

      expect(state.getShape('rect1').childIndex).toBe(1)
      expect(state.getShape('rect2').childIndex).toBe(2)
      expect(state.getShape('rect3').childIndex).toBe(3)
    })
    it.todo('Deletes any bindings to the group')
  })
})
