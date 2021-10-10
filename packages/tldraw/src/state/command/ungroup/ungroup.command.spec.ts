/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { GroupShape, TLDrawShapeType } from '~types'

describe('Ungroup command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate
      .loadDocument(mockDocument)
      .group(['rect1', 'rect2'], 'groupA')
      .select('groupA')
      .ungroup()

    expect(tlstate.getShape<GroupShape>('groupA')).toBeUndefined()
    expect(tlstate.getShape('rect1').parentId).toBe('page1')
    expect(tlstate.getShape('rect2').parentId).toBe('page1')

    tlstate.undo()

    expect(tlstate.getShape<GroupShape>('groupA')).toBeDefined()
    expect(tlstate.getShape<GroupShape>('groupA').children).toStrictEqual(['rect1', 'rect2'])
    expect(tlstate.getShape('rect1').parentId).toBe('groupA')
    expect(tlstate.getShape('rect2').parentId).toBe('groupA')

    tlstate.redo()

    expect(tlstate.getShape<GroupShape>('groupA')).toBeUndefined()
    expect(tlstate.getShape('rect1').parentId).toBe('page1')
    expect(tlstate.getShape('rect2').parentId).toBe('page1')
  })

  describe('When ungrouping', () => {
    it('Ungroups shapes on any page', () => {
      tlstate
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .createPage('page2')
        .ungroup(['groupA'], 'page1')

      expect(tlstate.getShape('groupA', 'page1')).toBeUndefined()
      tlstate.undo()
      expect(tlstate.getShape('groupA', 'page1')).toBeDefined()
    })

    it('Does not ungroup if a group shape is not selected', () => {
      tlstate.loadDocument(mockDocument).select('rect1')
      const before = tlstate.state
      tlstate.group()
      // State should not have changed
      expect(tlstate.state).toStrictEqual(before)
    })

    it('Correctly selects children after ungrouping', () => {
      const tlstate = new TLDrawState()
        .createShapes(
          {
            id: 'rect1',
            type: TLDrawShapeType.Rectangle,
            childIndex: 1,
          },
          {
            id: 'rect2',
            type: TLDrawShapeType.Rectangle,
            childIndex: 2,
          },
          {
            id: 'rect3',
            type: TLDrawShapeType.Rectangle,
            childIndex: 3,
          }
        )
        .group(['rect1', 'rect2'], 'groupA')
        .selectAll()
        .ungroup()

      // State should not have changed
      expect(tlstate.selectedIds).toStrictEqual(['rect3', 'rect1', 'rect2'])
    })

    it('Reparents shapes to the page at the correct childIndex', () => {
      const tlstate = new TLDrawState()
        .createShapes(
          {
            id: 'rect1',
            type: TLDrawShapeType.Rectangle,
            childIndex: 1,
          },
          {
            id: 'rect2',
            type: TLDrawShapeType.Rectangle,
            childIndex: 2,
          },
          {
            id: 'rect3',
            type: TLDrawShapeType.Rectangle,
            childIndex: 3,
          }
        )
        .group(['rect1', 'rect2'], 'groupA')

      const { childIndex } = tlstate.getShape<GroupShape>('groupA')

      expect(childIndex).toBe(1)
      expect(tlstate.getShape('rect1').childIndex).toBe(1)
      expect(tlstate.getShape('rect2').childIndex).toBe(2)
      expect(tlstate.getShape('rect3').childIndex).toBe(3)

      tlstate.ungroup()

      expect(tlstate.getShape('rect1').childIndex).toBe(1)
      expect(tlstate.getShape('rect2').childIndex).toBe(2)
      expect(tlstate.getShape('rect3').childIndex).toBe(3)
    })
    it.todo('Deletes any bindings to the group')
  })
})
