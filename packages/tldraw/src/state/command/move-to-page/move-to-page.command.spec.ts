import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { ArrowShape, TLDrawShapeType } from '~types'

describe('Move to page command', () => {
  const tlstate = new TLDrawState()

  /*
  Moving shapes to a new page should remove those shapes from the
  current page and add them to the specifed page. If bindings exist
  that effect the moved shapes, then the bindings should be destroyed
  on the old page and created on the new page only if both the "to"
  and "from" shapes were moved. The app should then change pages to
  the new page.
  */

  it('does, undoes and redoes command', () => {
    tlstate
      .loadDocument(mockDocument)
      .createPage('page2')
      .changePage('page1')
      .select('rect1', 'rect2')
      .moveToPage('page2')

    expect(tlstate.currentPageId).toBe('page2')
    expect(tlstate.getShape('rect1', 'page1')).toBeUndefined()
    expect(tlstate.getShape('rect1', 'page2')).toBeDefined()
    expect(tlstate.getShape('rect2', 'page1')).toBeUndefined()
    expect(tlstate.getShape('rect2', 'page2')).toBeDefined()
    expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])

    tlstate.undo()

    expect(tlstate.getShape('rect1', 'page1')).toBeDefined()
    expect(tlstate.getShape('rect1', 'page2')).toBeUndefined()
    expect(tlstate.getShape('rect2', 'page1')).toBeDefined()
    expect(tlstate.getShape('rect2', 'page2')).toBeUndefined()
    expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])
    expect(tlstate.currentPageId).toBe('page1')

    tlstate.redo()

    expect(tlstate.getShape('rect1', 'page1')).toBeUndefined()
    expect(tlstate.getShape('rect1', 'page2')).toBeDefined()
    expect(tlstate.getShape('rect2', 'page1')).toBeUndefined()
    expect(tlstate.getShape('rect2', 'page2')).toBeDefined()
    expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])
    expect(tlstate.currentPageId).toBe('page2')
  })

  describe('when moving shapes with bindings', () => {
    it('deletes bindings when only the bound-to shape is moved', () => {
      tlstate
        .loadDocument(mockDocument)
        .selectAll()
        .delete()
        .createShapes(
          { type: TLDrawShapeType.Rectangle, id: 'target1', size: [100, 100] },
          { type: TLDrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .startHandleSession([200, 200], 'start')
        .updateHandleSession([50, 50])
        .completeSession()

      const bindingId = tlstate.bindings[0].id
      expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      tlstate.createPage('page2').changePage('page1').select('target1').moveToPage('page2')

      expect(
        tlstate.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId
      ).toBeUndefined()
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      tlstate.undo()

      expect(tlstate.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBe(
        bindingId
      )
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeDefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      tlstate.redo()

      expect(
        tlstate.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId
      ).toBeUndefined()
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()
    })

    it('deletes bindings when only the bound-from shape is moved', () => {
      tlstate
        .loadDocument(mockDocument)
        .selectAll()
        .delete()
        .createShapes(
          { type: TLDrawShapeType.Rectangle, id: 'target1', size: [100, 100] },
          { type: TLDrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .startHandleSession([200, 200], 'start')
        .updateHandleSession([50, 50])
        .completeSession()

      const bindingId = tlstate.bindings[0].id
      expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      tlstate.createPage('page2').changePage('page1').select('arrow1').moveToPage('page2')

      expect(
        tlstate.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId
      ).toBeUndefined()
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      tlstate.undo()

      expect(tlstate.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBe(
        bindingId
      )
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeDefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      tlstate.redo()

      expect(
        tlstate.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId
      ).toBeUndefined()
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()
    })

    it('moves bindings when both shapes are moved', () => {
      tlstate
        .loadDocument(mockDocument)
        .selectAll()
        .delete()
        .createShapes(
          { type: TLDrawShapeType.Rectangle, id: 'target1', size: [100, 100] },
          { type: TLDrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .startHandleSession([200, 200], 'start')
        .updateHandleSession([50, 50])
        .completeSession()

      const bindingId = tlstate.bindings[0].id
      expect(tlstate.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      tlstate
        .createPage('page2')
        .changePage('page1')
        .select('arrow1', 'target1')
        .moveToPage('page2')

      expect(tlstate.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId).toBe(
        bindingId
      )
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeDefined()

      tlstate.undo()

      expect(tlstate.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBe(
        bindingId
      )
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeDefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      tlstate.redo()

      expect(tlstate.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId).toBe(
        bindingId
      )
      expect(tlstate.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(tlstate.document.pages['page2'].bindings[bindingId]).toBeDefined()
    })
  })

  describe('when moving grouped shapes', () => {
    it('moves groups and their children', () => {
      tlstate
        .loadDocument(mockDocument)
        .createPage('page2')
        .changePage('page1')
        .group(['rect1', 'rect2'], 'groupA')
        .moveToPage('page2')

      expect(tlstate.getShape('rect1', 'page1')).toBeUndefined()
      expect(tlstate.getShape('rect2', 'page1')).toBeUndefined()
      expect(tlstate.getShape('groupA', 'page1')).toBeUndefined()

      expect(tlstate.getShape('rect1', 'page2')).toBeDefined()
      expect(tlstate.getShape('rect2', 'page2')).toBeDefined()
      expect(tlstate.getShape('groupA', 'page2')).toBeDefined()

      tlstate.undo()

      expect(tlstate.getShape('rect1', 'page2')).toBeUndefined()
      expect(tlstate.getShape('rect2', 'page2')).toBeUndefined()
      expect(tlstate.getShape('groupA', 'page2')).toBeUndefined()

      expect(tlstate.getShape('rect1', 'page1')).toBeDefined()
      expect(tlstate.getShape('rect2', 'page1')).toBeDefined()
      expect(tlstate.getShape('groupA', 'page1')).toBeDefined()

      tlstate.redo()

      expect(tlstate.getShape('rect1', 'page1')).toBeUndefined()
      expect(tlstate.getShape('rect2', 'page1')).toBeUndefined()
      expect(tlstate.getShape('groupA', 'page1')).toBeUndefined()

      expect(tlstate.getShape('rect1', 'page2')).toBeDefined()
      expect(tlstate.getShape('rect2', 'page2')).toBeDefined()
      expect(tlstate.getShape('groupA', 'page2')).toBeDefined()
    })

    it('deletes groups shapes if the groups children were all moved', () => {
      // ...
    })

    it('reparents grouped shapes if the group is not moved', () => {
      tlstate
        .loadDocument(mockDocument)
        .createPage('page2')
        .changePage('page1')
        .group(['rect1', 'rect2', 'rect3'], 'groupA')
        .select('rect1')
        .moveToPage('page2')

      expect(tlstate.getShape('rect1', 'page1')).toBeUndefined()
      expect(tlstate.getShape('rect1', 'page2')).toBeDefined()
      expect(tlstate.getShape('rect1', 'page2').parentId).toBe('page2')
      expect(tlstate.getShape('groupA', 'page1').children).toStrictEqual(['rect2', 'rect3'])

      tlstate.undo()

      expect(tlstate.getShape('rect1', 'page2')).toBeUndefined()
      expect(tlstate.getShape('rect1', 'page1').parentId).toBe('groupA')
      expect(tlstate.getShape('groupA', 'page1').children).toStrictEqual([
        'rect1',
        'rect2',
        'rect3',
      ])
    })
  })
})
