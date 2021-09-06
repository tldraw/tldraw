import { TLDrawState } from './tlstate'
import { mockDocument, TLStateUtils } from '~test'
import { ColorStyle, TLDrawShapeType } from '~types'

describe('TLDrawState', () => {
  const tlstate = new TLDrawState()

  const tlu = new TLStateUtils(tlstate)

  describe('Copy and Paste', () => {
    it('copies a shape', () => {
      tlstate.loadDocument(mockDocument).deselectAll().copy(['rect1'])
    })

    it('pastes a shape', () => {
      tlstate.loadDocument(mockDocument)

      const prevCount = Object.keys(tlstate.page.shapes).length

      tlstate.deselectAll().copy(['rect1']).paste()

      expect(Object.keys(tlstate.page.shapes).length).toBe(prevCount + 1)

      tlstate.undo()

      expect(Object.keys(tlstate.page.shapes).length).toBe(prevCount)

      tlstate.redo()

      expect(Object.keys(tlstate.page.shapes).length).toBe(prevCount + 1)
    })

    it('pastes a shape to a new page', () => {
      tlstate.loadDocument(mockDocument)

      tlstate.deselectAll().copy(['rect1']).createPage().paste()

      expect(Object.keys(tlstate.page.shapes).length).toBe(1)

      tlstate.undo()

      expect(Object.keys(tlstate.page.shapes).length).toBe(0)

      tlstate.redo()

      expect(Object.keys(tlstate.page.shapes).length).toBe(1)
    })
  })

  describe('Selection', () => {
    it('selects a shape', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlu.clickShape('rect1')
      expect(tlstate.selectedIds).toStrictEqual(['rect1'])
      expect(tlstate.appState.status.current).toBe('idle')
    })

    it('selects and deselects a shape', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlu.clickShape('rect1')
      tlu.clickCanvas()
      expect(tlstate.selectedIds).toStrictEqual([])
      expect(tlstate.appState.status.current).toBe('idle')
    })

    it('selects multiple shapes', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlu.clickShape('rect1')
      tlu.clickShape('rect2', { shiftKey: true })
      expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])
      expect(tlstate.appState.status.current).toBe('idle')
    })

    it('shift-selects to deselect shapes', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlu.clickShape('rect1')
      tlu.clickShape('rect2', { shiftKey: true })
      tlu.clickShape('rect2', { shiftKey: true })
      expect(tlstate.selectedIds).toStrictEqual(['rect1'])
      expect(tlstate.appState.status.current).toBe('idle')
    })

    it('clears selection when clicking bounds', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlstate.startBrushSession([-10, -10])
      tlstate.updateBrushSession([110, 110])
      tlstate.completeSession()
      expect(tlstate.selectedIds.length).toBe(3)
    })

    it('selects selected shape when single-clicked', () => {
      tlstate.loadDocument(mockDocument).selectAll()
      tlu.clickShape('rect2')
      expect(tlstate.selectedIds).toStrictEqual(['rect2'])
    })

    // it('selects shape when double-clicked', () => {
    //   tlstate.loadDocument(mockDocument).selectAll()
    //   tlu.doubleClickShape('rect2')
    //   expect(tlstate.selectedIds).toStrictEqual(['rect2'])
    // })

    it('does not select on meta-click', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlu.clickShape('rect1', { ctrlKey: true })
      expect(tlstate.selectedIds).toStrictEqual([])
      expect(tlstate.appState.status.current).toBe('idle')
    })

    it.todo('deletes shapes if cancelled during creating')

    it.todo('deletes shapes on undo after creating')

    it.todo('re-creates shapes on redo after creating')

    it.todo('selects all')

    // Single click on a selected shape to select just that shape

    it('single-selects shape in selection on click', () => {
      tlstate.deselectAll()
      tlu.clickShape('rect1')
      tlu.clickShape('rect2', { shiftKey: true })
      tlu.clickShape('rect2')
      expect(tlstate.selectedIds).toStrictEqual(['rect2'])
      expect(tlstate.appState.status.current).toBe('idle')
    })

    it('single-selects shape in selection on pointerup only', () => {
      tlstate.deselectAll()
      tlu.clickShape('rect1')
      tlu.clickShape('rect2', { shiftKey: true })
      tlu.pointShape('rect2')
      expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])
      tlu.stopPointing('rect2')
      expect(tlstate.selectedIds).toStrictEqual(['rect2'])
      expect(tlstate.appState.status.current).toBe('idle')
    })

    // it('selects shapes if shift key is lifted before pointerup', () => {
    //   tlstate.deselectAll()
    //   tlu.clickShape('rect1')
    //   tlu.pointShape('rect2', { shiftKey: true })
    //   expect(tlstate.appState.status.current).toBe('pointingBounds')
    //   tlu.stopPointing('rect2')
    //   expect(tlstate.selectedIds).toStrictEqual(['rect2'])
    //   expect(tlstate.appState.status.current).toBe('idle')
    // })
  })

  describe('Select history', () => {
    it('selects, undoes and redoes', () => {
      tlstate.reset().loadDocument(mockDocument)

      expect(tlstate.selectHistory.pointer).toBe(0)
      expect(tlstate.selectHistory.stack).toStrictEqual([[]])
      expect(tlstate.selectedIds).toStrictEqual([])

      tlu.pointShape('rect1')

      expect(tlstate.selectHistory.pointer).toBe(1)
      expect(tlstate.selectHistory.stack).toStrictEqual([[], ['rect1']])
      expect(tlstate.selectedIds).toStrictEqual(['rect1'])

      tlu.stopPointing('rect1')

      expect(tlstate.selectHistory.pointer).toBe(1)
      expect(tlstate.selectHistory.stack).toStrictEqual([[], ['rect1']])
      expect(tlstate.selectedIds).toStrictEqual(['rect1'])

      tlu.clickShape('rect2', { shiftKey: true })

      expect(tlstate.selectHistory.pointer).toBe(2)
      expect(tlstate.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect1', 'rect2']])
      expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])

      tlstate.undoSelect()

      expect(tlstate.selectHistory.pointer).toBe(1)
      expect(tlstate.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect1', 'rect2']])
      expect(tlstate.selectedIds).toStrictEqual(['rect1'])

      tlstate.undoSelect()

      expect(tlstate.selectHistory.pointer).toBe(0)
      expect(tlstate.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect1', 'rect2']])
      expect(tlstate.selectedIds).toStrictEqual([])

      tlstate.redoSelect()

      expect(tlstate.selectHistory.pointer).toBe(1)
      expect(tlstate.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect1', 'rect2']])
      expect(tlstate.selectedIds).toStrictEqual(['rect1'])

      tlstate.select('rect2')

      expect(tlstate.selectHistory.pointer).toBe(2)
      expect(tlstate.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect2']])
      expect(tlstate.selectedIds).toStrictEqual(['rect2'])

      tlstate.delete()

      expect(tlstate.selectHistory.pointer).toBe(0)
      expect(tlstate.selectHistory.stack).toStrictEqual([[]])
      expect(tlstate.selectedIds).toStrictEqual([])

      tlstate.undoSelect()

      expect(tlstate.selectHistory.pointer).toBe(0)
      expect(tlstate.selectHistory.stack).toStrictEqual([[]])
      expect(tlstate.selectedIds).toStrictEqual([])
    })
  })

  describe('Copies to JSON', () => {
    tlstate.selectAll()
    expect(tlstate.copyJson()).toMatchSnapshot('copied json')
  })

  describe('Copies to SVG', () => {
    tlstate.selectAll()
    expect(tlstate.copySvg()).toMatchSnapshot('copied svg')
  })

  describe('Mutates bound shapes', () => {
    const tlstate = new TLDrawState()
      .createShapes(
        {
          id: 'rect',
          point: [0, 0],
          size: [100, 100],
          childIndex: 1,
          type: TLDrawShapeType.Rectangle,
        },
        {
          id: 'arrow',
          point: [200, 200],
          childIndex: 2,
          type: TLDrawShapeType.Arrow,
        }
      )
      .select('arrow')
      .startHandleSession([200, 200], 'start', 'arrow')
      .updateHandleSession([10, 10])
      .completeSession()
      .selectAll()
      .style({ color: ColorStyle.Red })

    expect(tlstate.getShape('arrow').style.color).toBe(ColorStyle.Red)
    expect(tlstate.getShape('rect').style.color).toBe(ColorStyle.Red)

    tlstate.undo()

    expect(tlstate.getShape('arrow').style.color).toBe(ColorStyle.Black)
    expect(tlstate.getShape('rect').style.color).toBe(ColorStyle.Black)

    tlstate.redo()

    expect(tlstate.getShape('arrow').style.color).toBe(ColorStyle.Red)
    expect(tlstate.getShape('rect').style.color).toBe(ColorStyle.Red)
  })

  describe('when selecting shapes in a group', () => {
    it('selects the group when a grouped shape is clicked', () => {
      const tlstate = new TLDrawState()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')

      const tlu = new TLStateUtils(tlstate)
      tlu.clickShape('rect1')
      expect(tlstate.selectedGroupId).toBeUndefined()
      expect(tlstate.selectedIds).toStrictEqual(['groupA'])
    })

    it('selects the grouped shape when double clicked', () => {
      const tlstate = new TLDrawState()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')

      const tlu = new TLStateUtils(tlstate)
      tlu.doubleClickShape('rect1')
      expect(tlstate.selectedGroupId).toStrictEqual('groupA')
      expect(tlstate.selectedIds).toStrictEqual(['rect1'])
    })

    it('clears the selectedGroupId when selecting a different shape', () => {
      const tlstate = new TLDrawState()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')

      const tlu = new TLStateUtils(tlstate)
      tlu.doubleClickShape('rect1')
      tlu.clickShape('rect3')
      expect(tlstate.selectedGroupId).toBeUndefined()
      expect(tlstate.selectedIds).toStrictEqual(['rect3'])
    })

    it('selects a grouped shape when meta-shift-clicked', () => {
      const tlstate = new TLDrawState()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .deselectAll()

      const tlu = new TLStateUtils(tlstate)

      tlu.clickShape('rect1', { ctrlKey: true, shiftKey: true })
      expect(tlstate.selectedIds).toStrictEqual(['rect1'])

      tlu.clickShape('rect1', { ctrlKey: true, shiftKey: true })
      expect(tlstate.selectedIds).toStrictEqual([])
    })

    it('selects a hovered shape from the selected group when meta-shift-clicked', () => {
      const tlstate = new TLDrawState()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')

      const tlu = new TLStateUtils(tlstate)

      tlu.clickShape('rect1', { ctrlKey: true, shiftKey: true })
      expect(tlstate.selectedIds).toStrictEqual(['rect1'])

      tlu.clickShape('rect1', { ctrlKey: true, shiftKey: true })
      expect(tlstate.selectedIds).toStrictEqual([])
    })
  })

  describe('when creating shapes', () => {
    it('Creates shapes with the correct child index', () => {
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
        .selectTool(TLDrawShapeType.Rectangle)
        .createActiveToolShape([0, 0], 'rect4')

      expect(tlstate.getShape('rect4').childIndex).toBe(4)

      tlstate
        .group(['rect2', 'rect3', 'rect4'], 'groupA')
        .selectTool(TLDrawShapeType.Rectangle)
        .createActiveToolShape([0, 0], 'rect5')

      expect(tlstate.getShape('groupA').childIndex).toBe(2)
      expect(tlstate.getShape('rect5').childIndex).toBe(3)
    })
  })

  it('Exposes undo/redo stack', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'rect1',
        type: TLDrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })
      .createShapes({
        id: 'rect2',
        type: TLDrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })

    expect(tlstate.history.length).toBe(2)

    expect(tlstate.history).toBeDefined()
    expect(tlstate.history).toMatchSnapshot('history')

    tlstate.history = []
    expect(tlstate.history).toEqual([])

    const before = tlstate.state
    tlstate.undo()
    const after = tlstate.state

    expect(before).toBe(after)
  })

  it('Exposes undo/redo stack up to the current pointer', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'rect1',
        type: TLDrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })
      .createShapes({
        id: 'rect2',
        type: TLDrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })
      .undo()

    expect(tlstate.history.length).toBe(1)
  })

  it('Sets the undo/redo history', () => {
    const tlstate = new TLDrawState('some_state_a')
      .createShapes({
        id: 'rect1',
        type: TLDrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })
      .createShapes({
        id: 'rect2',
        type: TLDrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })

    // Save the history and document from the first state
    const doc = tlstate.document
    const history = tlstate.history

    // Create a new state
    const tlstate2 = new TLDrawState('some_state_b')

    // Load the document and set the history
    tlstate2.loadDocument(doc)
    tlstate2.history = history

    expect(tlstate2.shapes.length).toBe(2)

    // We should be able to undo the change that was made on the first
    // state, now that we've brought in its undo / redo stack
    tlstate2.undo()

    expect(tlstate2.shapes.length).toBe(1)
  })
})
