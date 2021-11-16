import { mockDocument, TldrawTestApp } from '~test'
import { ArrowShape, SessionType, TDShapeType } from '~types'

describe('Move to page command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument).createPage('page2').changePage('page1')
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = app.state
      app.moveToPage('page2')
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  /*
  Moving shapes to a new page should remove those shapes from the
  current page and add them to the specified page. If bindings exist
  that effect the moved shapes, then the bindings should be destroyed
  on the old page and created on the new page only if both the "to"
  and "from" shapes were moved. The app should then change pages to
  the new page.
  */

  it('does, undoes and redoes command', () => {
    app.select('rect1', 'rect2').moveToPage('page2')

    expect(app.currentPageId).toBe('page2')
    expect(app.getShape('rect1', 'page1')).toBeUndefined()
    expect(app.getShape('rect1', 'page2')).toBeDefined()
    expect(app.getShape('rect2', 'page1')).toBeUndefined()
    expect(app.getShape('rect2', 'page2')).toBeDefined()
    expect(app.selectedIds).toStrictEqual(['rect1', 'rect2'])

    app.undo()

    expect(app.getShape('rect1', 'page1')).toBeDefined()
    expect(app.getShape('rect1', 'page2')).toBeUndefined()
    expect(app.getShape('rect2', 'page1')).toBeDefined()
    expect(app.getShape('rect2', 'page2')).toBeUndefined()
    expect(app.selectedIds).toStrictEqual(['rect1', 'rect2'])
    expect(app.currentPageId).toBe('page1')

    app.redo()

    expect(app.getShape('rect1', 'page1')).toBeUndefined()
    expect(app.getShape('rect1', 'page2')).toBeDefined()
    expect(app.getShape('rect2', 'page1')).toBeUndefined()
    expect(app.getShape('rect2', 'page2')).toBeDefined()
    expect(app.selectedIds).toStrictEqual(['rect1', 'rect2'])
    expect(app.currentPageId).toBe('page2')
  })

  describe('when moving shapes with bindings', () => {
    it('deletes bindings when only the bound-to shape is moved', () => {
      app
        .selectAll()
        .delete()
        .createShapes(
          { type: TDShapeType.Rectangle, id: 'target1', size: [100, 100] },
          { type: TDShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
        .completeSession()

      const bindingId = app.bindings[0].id
      expect(app.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      app.select('target1').moveToPage('page2')

      expect(app.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBeUndefined()
      expect(app.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(app.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      app.undo()

      expect(app.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBe(bindingId)
      expect(app.document.pages['page1'].bindings[bindingId]).toBeDefined()
      expect(app.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      app.redo()

      expect(app.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBeUndefined()
      expect(app.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(app.document.pages['page2'].bindings[bindingId]).toBeUndefined()
    })

    it('deletes bindings when only the bound-from shape is moved', () => {
      app
        .selectAll()
        .delete()
        .createShapes(
          { type: TDShapeType.Rectangle, id: 'target1', size: [100, 100] },
          { type: TDShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
        .completeSession()

      const bindingId = app.bindings[0].id
      expect(app.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      app.select('arrow1').moveToPage('page2')

      expect(app.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId).toBeUndefined()
      expect(app.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(app.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      app.undo()

      expect(app.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBe(bindingId)
      expect(app.document.pages['page1'].bindings[bindingId]).toBeDefined()
      expect(app.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      app.redo()

      expect(app.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId).toBeUndefined()
      expect(app.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(app.document.pages['page2'].bindings[bindingId]).toBeUndefined()
    })

    it('moves bindings when both shapes are moved', () => {
      app
        .selectAll()
        .delete()
        .createShapes(
          { type: TDShapeType.Rectangle, id: 'target1', size: [100, 100] },
          { type: TDShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([50, 50])
        .completeSession()

      const bindingId = app.bindings[0].id
      expect(app.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBe(bindingId)

      app.select('arrow1', 'target1').moveToPage('page2')

      expect(app.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId).toBe(bindingId)
      expect(app.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(app.document.pages['page2'].bindings[bindingId]).toBeDefined()

      app.undo()

      expect(app.getShape<ArrowShape>('arrow1', 'page1').handles.start.bindingId).toBe(bindingId)
      expect(app.document.pages['page1'].bindings[bindingId]).toBeDefined()
      expect(app.document.pages['page2'].bindings[bindingId]).toBeUndefined()

      app.redo()

      expect(app.getShape<ArrowShape>('arrow1', 'page2').handles.start.bindingId).toBe(bindingId)
      expect(app.document.pages['page1'].bindings[bindingId]).toBeUndefined()
      expect(app.document.pages['page2'].bindings[bindingId]).toBeDefined()
    })
  })

  describe('when moving grouped shapes', () => {
    it('moves groups and their children', () => {
      app.group(['rect1', 'rect2'], 'groupA').moveToPage('page2')

      expect(app.getShape('rect1', 'page1')).toBeUndefined()
      expect(app.getShape('rect2', 'page1')).toBeUndefined()
      expect(app.getShape('groupA', 'page1')).toBeUndefined()

      expect(app.getShape('rect1', 'page2')).toBeDefined()
      expect(app.getShape('rect2', 'page2')).toBeDefined()
      expect(app.getShape('groupA', 'page2')).toBeDefined()

      app.undo()

      expect(app.getShape('rect1', 'page2')).toBeUndefined()
      expect(app.getShape('rect2', 'page2')).toBeUndefined()
      expect(app.getShape('groupA', 'page2')).toBeUndefined()

      expect(app.getShape('rect1', 'page1')).toBeDefined()
      expect(app.getShape('rect2', 'page1')).toBeDefined()
      expect(app.getShape('groupA', 'page1')).toBeDefined()

      app.redo()

      expect(app.getShape('rect1', 'page1')).toBeUndefined()
      expect(app.getShape('rect2', 'page1')).toBeUndefined()
      expect(app.getShape('groupA', 'page1')).toBeUndefined()

      expect(app.getShape('rect1', 'page2')).toBeDefined()
      expect(app.getShape('rect2', 'page2')).toBeDefined()
      expect(app.getShape('groupA', 'page2')).toBeDefined()
    })

    it.todo('deletes groups shapes if the groups children were all moved')

    it('reparents grouped shapes if the group is not moved', () => {
      app.group(['rect1', 'rect2', 'rect3'], 'groupA').select('rect1').moveToPage('page2')

      expect(app.getShape('rect1', 'page1')).toBeUndefined()
      expect(app.getShape('rect1', 'page2')).toBeDefined()
      expect(app.getShape('rect1', 'page2').parentId).toBe('page2')
      expect(app.getShape('groupA', 'page1').children).toStrictEqual(['rect2', 'rect3'])

      app.undo()

      expect(app.getShape('rect1', 'page2')).toBeUndefined()
      expect(app.getShape('rect1', 'page1').parentId).toBe('groupA')
      expect(app.getShape('groupA', 'page1').children).toStrictEqual(['rect1', 'rect2', 'rect3'])
    })
  })

  it.todo('Does not delete uneffected bindings.')
})
