import { TLDrawState } from './tlstate'
import { mockDocument, TLStateUtils } from '~test'

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
      expect(tlstate.selectedIds).toStrictEqual(['rect1', 'rect2'])
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

    it('does not select on meta-shift-click', () => {
      tlstate.loadDocument(mockDocument).deselectAll()
      tlu.clickShape('rect1', { ctrlKey: true, shiftKey: true })
      expect(tlstate.selectedIds).toStrictEqual([])
      expect(tlstate.appState.status.current).toBe('idle')
    })

    it('deletes shapes if cancelled during creating', () => {
      // TODO
    })

    it('deletes shapes on undo after creating', () => {
      // TODO
    })

    it('re-creates shapes on undo after creating', () => {
      // TODO
    })

    it('selects all', () => {
      // TODO
    })

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
    tlstate.copyJson()
  })

  describe('Copies to SVG', () => {
    tlstate.selectAll()
    tlstate.copySvg()
  })
})
