/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { mockDocument, TldrawTestApp } from '~test'
import { ArrowShape, ColorStyle, SessionType, TldrawShapeType } from '~types'
import type { SelectTool } from './tools/SelectTool'

describe('TldrawTestApp', () => {
  describe('When copying and pasting...', () => {
    it('copies a shape', () => {
      const state = new TldrawTestApp().loadDocument(mockDocument).selectNone().copy(['rect1'])
    })

    it('pastes a shape', () => {
      const state = new TldrawTestApp().loadDocument(mockDocument)

      const prevCount = Object.keys(state.page.shapes).length

      state.selectNone().copy(['rect1']).paste()

      expect(Object.keys(state.page.shapes).length).toBe(prevCount + 1)

      state.undo()

      expect(Object.keys(state.page.shapes).length).toBe(prevCount)

      state.redo()

      expect(Object.keys(state.page.shapes).length).toBe(prevCount + 1)
    })

    it('pastes a shape to a new page', () => {
      const state = new TldrawTestApp().loadDocument(mockDocument)

      state.selectNone().copy(['rect1']).createPage().paste()

      expect(Object.keys(state.page.shapes).length).toBe(1)

      state.undo()

      expect(Object.keys(state.page.shapes).length).toBe(0)

      state.redo()

      expect(Object.keys(state.page.shapes).length).toBe(1)
    })

    it('Copies grouped shapes.', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .select('groupA')
        .copy()

      const beforeShapes = state.shapes

      state.paste()

      expect(state.shapes.filter((shape) => shape.type === TldrawShapeType.Group).length).toBe(2)

      const afterShapes = state.shapes

      const newShapes = afterShapes.filter(
        (shape) => !beforeShapes.find(({ id }) => id === shape.id)
      )

      const newGroup = newShapes.find((shape) => shape.type === TldrawShapeType.Group)

      const newChildIds = newShapes
        .filter((shape) => shape.type !== TldrawShapeType.Group)
        .map((shape) => shape.id)

      expect(new Set(newGroup!.children)).toEqual(new Set(newChildIds))
    })

    it.todo("Pastes in to the top child index of the page's children.")

    it.todo('Pastes in the correct child index order.')
  })

  describe('When copying and pasting a shape with bindings', () => {
    it('copies two bound shapes and their binding', () => {
      const state = new TldrawTestApp()

      state
        .createShapes(
          { type: TldrawShapeType.Rectangle, id: 'target1', point: [0, 0], size: [100, 100] },
          { type: TldrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([55, 55])
        .completeSession()

      expect(state.bindings.length).toBe(1)

      state.selectAll().copy().paste()

      const newArrow = state.shapes.sort((a, b) => b.childIndex - a.childIndex)[0] as ArrowShape

      expect(newArrow.handles.start.bindingId).not.toBe(
        state.getShape<ArrowShape>('arrow1').handles.start.bindingId
      )

      expect(state.bindings.length).toBe(2)
    })

    it('removes bindings from copied shape handles', () => {
      const state = new TldrawTestApp()

      state
        .createShapes(
          { type: TldrawShapeType.Rectangle, id: 'target1', point: [0, 0], size: [100, 100] },
          { type: TldrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([55, 55])
        .completeSession()

      expect(state.bindings.length).toBe(1)

      expect(state.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBeDefined()

      state.select('arrow1').copy().paste()

      const newArrow = state.shapes.sort((a, b) => b.childIndex - a.childIndex)[0] as ArrowShape

      expect(newArrow.handles.start.bindingId).toBeUndefined()
    })
  })

  describe('Selection', () => {
    it('selects a shape', () => {
      const state = new TldrawTestApp().loadDocument(mockDocument).selectNone().clickShape('rect1')
      expect(state.selectedIds).toStrictEqual(['rect1'])
      expect(state.appState.status).toBe('idle')
    })

    it('selects and deselects a shape', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .selectNone()
        .clickShape('rect1')
        .clickCanvas()
      expect(state.selectedIds).toStrictEqual([])
      expect(state.appState.status).toBe('idle')
    })

    it('selects multiple shapes', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .selectNone()
        .clickShape('rect1')
        .clickShape('rect2', { shiftKey: true })
      expect(state.selectedIds).toStrictEqual(['rect1', 'rect2'])
      expect(state.appState.status).toBe('idle')
    })

    it('shift-selects to deselect shapes', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .selectNone()
        .clickShape('rect1')
        .clickShape('rect2', { shiftKey: true })
        .clickShape('rect2', { shiftKey: true })
      expect(state.selectedIds).toStrictEqual(['rect1'])
      expect(state.appState.status).toBe('idle')
    })

    it('clears selection when clicking bounds', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .selectAll()
        .clickBounds()
        .completeSession()
      expect(state.selectedIds.length).toBe(0)
    })

    it('selects selected shape when single-clicked', () => {
      new TldrawTestApp()
        .loadDocument(mockDocument)
        .selectAll()
        .expectSelectedIdsToBe(['rect1', 'rect2', 'rect3'])
        .pointShape('rect1')
        .pointBounds() // because it is selected, argh
        .stopPointing('rect1')
        .expectSelectedIdsToBe(['rect1'])
    })

    // it('selects shape when double-clicked', () => {
    //   state.loadDocument(mockDocument).selectAll()
    //   .doubleClickShape('rect2')
    //   expect(state.selectedIds).toStrictEqual(['rect2'])
    // })

    it('does not select on meta-click', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .selectNone()
        .clickShape('rect1', { ctrlKey: true })
        .expectSelectedIdsToBe([])

      expect(state.appState.status).toBe('idle')
    })

    it.todo('deletes shapes if cancelled during creating')

    it.todo('deletes shapes on undo after creating')

    it.todo('re-creates shapes on redo after creating')

    describe('When selecting all', () => {
      it('selects all', () => {
        const state = new TldrawTestApp().loadDocument(mockDocument).selectAll()
        expect(state.selectedIds).toMatchSnapshot('selected all')
      })

      it('does not select children of a group', () => {
        const state = new TldrawTestApp().loadDocument(mockDocument).selectAll().group()
        expect(state.selectedIds.length).toBe(1)
      })
    })

    // Single click on a selected shape to select just that shape

    it('single-selects shape in selection on click', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .clickShape('rect1')
        .clickShape('rect2', { shiftKey: true })
        .clickShape('rect2')
      expect(state.selectedIds).toStrictEqual(['rect2'])
      expect(state.appState.status).toBe('idle')
    })

    it('single-selects shape in selection on pointerup only', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .clickShape('rect1')
        .clickShape('rect2', { shiftKey: true })
        .pointShape('rect2')
      expect(state.selectedIds).toStrictEqual(['rect1', 'rect2'])
      state.stopPointing('rect2')
      expect(state.selectedIds).toStrictEqual(['rect2'])
      expect(state.appState.status).toBe('idle')
    })

    // it('selects shapes if shift key is lifted before pointerup', () => {
    //   state.selectNone()
    //   .clickShape('rect1')
    //   .pointShape('rect2', { shiftKey: true })
    //   expect(state.appState.status).toBe('pointingBounds')
    //   .stopPointing('rect2')
    //   expect(state.selectedIds).toStrictEqual(['rect2'])
    //   expect(state.appState.status).toBe('idle')
    // })
  })

  describe('Select history', () => {
    it('selects, undoes and redoes', () => {
      const state = new TldrawTestApp().loadDocument(mockDocument)

      expect(state.selectHistory.pointer).toBe(0)
      expect(state.selectHistory.stack).toStrictEqual([[]])
      expect(state.selectedIds).toStrictEqual([])
      state.pointShape('rect1')

      expect(state.selectHistory.pointer).toBe(1)
      expect(state.selectHistory.stack).toStrictEqual([[], ['rect1']])
      expect(state.selectedIds).toStrictEqual(['rect1'])

      state.stopPointing('rect1')

      expect(state.selectHistory.pointer).toBe(1)
      expect(state.selectHistory.stack).toStrictEqual([[], ['rect1']])
      expect(state.selectedIds).toStrictEqual(['rect1'])

      state.clickShape('rect2', { shiftKey: true })

      expect(state.selectHistory.pointer).toBe(2)
      expect(state.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect1', 'rect2']])
      expect(state.selectedIds).toStrictEqual(['rect1', 'rect2'])

      state.undoSelect()

      expect(state.selectHistory.pointer).toBe(1)
      expect(state.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect1', 'rect2']])
      expect(state.selectedIds).toStrictEqual(['rect1'])

      state.undoSelect()

      expect(state.selectHistory.pointer).toBe(0)
      expect(state.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect1', 'rect2']])
      expect(state.selectedIds).toStrictEqual([])

      state.redoSelect()

      expect(state.selectHistory.pointer).toBe(1)
      expect(state.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect1', 'rect2']])
      expect(state.selectedIds).toStrictEqual(['rect1'])

      state.select('rect2')

      expect(state.selectHistory.pointer).toBe(2)
      expect(state.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect2']])
      expect(state.selectedIds).toStrictEqual(['rect2'])

      state.delete()

      expect(state.selectHistory.pointer).toBe(0)
      expect(state.selectHistory.stack).toStrictEqual([[]])
      expect(state.selectedIds).toStrictEqual([])

      state.undoSelect()

      expect(state.selectHistory.pointer).toBe(0)
      expect(state.selectHistory.stack).toStrictEqual([[]])
      expect(state.selectedIds).toStrictEqual([])
    })
  })

  describe('Copies to JSON', () => {
    const state = new TldrawTestApp().loadDocument(mockDocument).selectAll()
    expect(state.copyJson()).toMatchSnapshot('copied json')
  })

  describe('Mutates bound shapes', () => {
    const state = new TldrawTestApp()
      .createShapes(
        {
          id: 'rect',
          point: [0, 0],
          size: [100, 100],
          childIndex: 1,
          type: TldrawShapeType.Rectangle,
        },
        {
          id: 'arrow',
          point: [200, 200],
          childIndex: 2,
          type: TldrawShapeType.Arrow,
        }
      )
      .select('arrow')
      .movePointer([200, 200])
      .startSession(SessionType.Arrow, 'arrow', 'start')
      .movePointer([10, 10])
      .completeSession()
      .selectAll()
      .style({ color: ColorStyle.Red })

    expect(state.getShape('arrow').style.color).toBe(ColorStyle.Red)
    expect(state.getShape('rect').style.color).toBe(ColorStyle.Red)

    state.undo()

    expect(state.getShape('arrow').style.color).toBe(ColorStyle.Black)
    expect(state.getShape('rect').style.color).toBe(ColorStyle.Black)

    state.redo()

    expect(state.getShape('arrow').style.color).toBe(ColorStyle.Red)
    expect(state.getShape('rect').style.color).toBe(ColorStyle.Red)
  })

  describe('when selecting shapes in a group', () => {
    it('selects the group when a grouped shape is clicked', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .clickShape('rect1')

      expect((state.currentTool as SelectTool).selectedGroupId).toBeUndefined()
      expect(state.selectedIds).toStrictEqual(['groupA'])
    })

    it('selects the grouped shape when double clicked', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .doubleClickShape('rect1')

      expect((state.currentTool as SelectTool).selectedGroupId).toStrictEqual('groupA')
      expect(state.selectedIds).toStrictEqual(['rect1'])
    })

    it('clears the selectedGroupId when selecting a different shape', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .doubleClickShape('rect1')
        .clickShape('rect3')

      expect((state.currentTool as SelectTool).selectedGroupId).toBeUndefined()
      expect(state.selectedIds).toStrictEqual(['rect3'])
    })

    it('selects a grouped shape when meta-shift-clicked', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .selectNone()
        .clickShape('rect1', { ctrlKey: true, shiftKey: true })

      expect(state.selectedIds).toStrictEqual(['rect1'])

      state.clickShape('rect1', { ctrlKey: true, shiftKey: true })

      expect(state.selectedIds).toStrictEqual([])
    })

    it('selects a hovered shape from the selected group when meta-shift-clicked', () => {
      const state = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .clickShape('rect1', { ctrlKey: true, shiftKey: true })

      expect(state.selectedIds).toStrictEqual(['rect1'])

      state.clickShape('rect1', { ctrlKey: true, shiftKey: true })

      expect(state.selectedIds).toStrictEqual([])
    })
  })

  describe('when creating shapes', () => {
    it('Creates shapes with the correct child index', () => {
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
        .selectTool(TldrawShapeType.Rectangle)

      const prevA = state.shapes.map((shape) => shape.id)

      state.pointCanvas({ x: 0, y: 0 }).movePointer({ x: 100, y: 100 }).stopPointing()

      const newIdA = state.shapes.map((shape) => shape.id).find((id) => !prevA.includes(id))!
      const shapeA = state.getShape(newIdA)
      expect(shapeA.childIndex).toBe(4)

      state.group(['rect2', 'rect3', newIdA], 'groupA')

      expect(state.getShape('groupA').childIndex).toBe(2)

      state.selectNone()
      state.selectTool(TldrawShapeType.Rectangle)

      const prevB = state.shapes.map((shape) => shape.id)

      state.pointCanvas({ x: 0, y: 0 }).movePointer({ x: 100, y: 100 }).stopPointing()

      const newIdB = state.shapes.map((shape) => shape.id).find((id) => !prevB.includes(id))!
      const shapeB = state.getShape(newIdB)
      expect(shapeB.childIndex).toBe(3)
    })
  })

  it('Exposes undo/redo stack', () => {
    const state = new TldrawTestApp()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'rect1',
        type: TldrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })
      .createShapes({
        id: 'rect2',
        type: TldrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })

    expect(state.history.length).toBe(2)

    expect(state.history).toBeDefined()
    expect(state.history).toMatchSnapshot('history')

    state.history = []
    expect(state.history).toEqual([])

    const before = state.state
    state.undo()
    const after = state.state

    expect(before).toBe(after)
  })

  it('Exposes undo/redo stack up to the current pointer', () => {
    const state = new TldrawTestApp()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'rect1',
        type: TldrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })
      .createShapes({
        id: 'rect2',
        type: TldrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })
      .undo()

    expect(state.history.length).toBe(1)
  })

  it('Sets the undo/redo history', () => {
    const state = new TldrawTestApp('some_state_a')
      .createShapes({
        id: 'rect1',
        type: TldrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })
      .createShapes({
        id: 'rect2',
        type: TldrawShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })

    // Save the history and document from the first state
    const doc = state.document
    const history = state.history

    // Create a new state
    const state2 = new TldrawTestApp('some_state_b')

    // Load the document and set the history
    state2.loadDocument(doc)
    state2.history = history

    expect(state2.shapes.length).toBe(2)

    // We should be able to undo the change that was made on the first
    // state, now that we've brought in its undo / redo stack
    state2.undo()

    expect(state2.shapes.length).toBe(1)
  })

  describe('When copying to SVG', () => {
    it('Copies shapes.', () => {
      const state = new TldrawTestApp()
      const result = state
        .loadDocument(mockDocument)
        .select('rect1')
        .rotate(0.1)
        .selectAll()
        .copySvg()
      expect(result).toMatchSnapshot('copied svg')
    })

    it('Copies grouped shapes.', () => {
      const state = new TldrawTestApp()
      const result = state
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group()
        .selectAll()
        .copySvg()

      expect(result).toMatchSnapshot('copied svg with group')
    })

    it.todo('Copies Text shapes as <text> elements.')
    // it('Copies Text shapes as <text> elements.', () => {
    //   const state2 = new TldrawTestApp()

    //   const svgString = state2
    //     .createShapes({
    //       id: 'text1',
    //       type: TldrawShapeType.Text,
    //       text: 'hello world!',
    //     })
    //     .select('text1')
    //     .copySvg()

    //   expect(svgString).toBeTruthy()
    // })
  })

  describe('when the document prop changes', () => {
    it.todo('replaces the document if the ids are different')

    it.todo('updates the document if the new id is the same as the old one')
  })
  /*
    We want to be able to use the `document` property to update the
    document without blowing out the current state. For example, we
    may want to patch in changes that occurred from another user.

    When the `document` prop changes in the Tldraw component, we want
    to update the document in a way that preserves the identity of as
    much as possible, while still protecting against invalid states.

    If this isn't possible, then we should guide the developer to
    instead use a helper like `patchDocument` to update the document.

    If the `id` property of the new document is the same as the
    previous document, then we call `updateDocument`. Otherwise, we
    call `replaceDocument`, which does a harder reset of the state's
    internal state.
  */

  jest.setTimeout(10000)

  describe('When changing versions', () => {
    it('migrates correctly', (done) => {
      const defaultState = TldrawTestApp.defaultState

      const withoutRoom = {
        ...defaultState,
      }

      delete withoutRoom.room

      TldrawTestApp.defaultState = withoutRoom

      const state = new TldrawTestApp('migrate_1')

      state.createShapes({
        id: 'rect1',
        type: TldrawShapeType.Rectangle,
      })

      setTimeout(() => {
        // TODO: Force the version to change and restore room.
        TldrawTestApp.version = 100
        TldrawTestApp.defaultState.room = defaultState.room

        const state2 = new TldrawTestApp('migrate_1')

        setTimeout(() => {
          try {
            expect(state2.getShape('rect1')).toBeTruthy()
            done()
          } catch (e) {
            done(e)
          }
        }, 100)
      }, 100)
    })
  })
})
