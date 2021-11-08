/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLDrawState } from './TLDrawState'
import { mockDocument, TLDrawStateUtils } from '~test'
import { ArrowShape, ColorStyle, SessionType, TLDrawShapeType } from '~types'
import type { SelectTool } from './tools/SelectTool'

describe('TLDrawState', () => {
  const state = new TLDrawState()

  const tlu = new TLDrawStateUtils(state)

  describe('When copying and pasting...', () => {
    it('copies a shape', () => {
      state.loadDocument(mockDocument).selectNone().copy(['rect1'])
    })

    it('pastes a shape', () => {
      state.loadDocument(mockDocument)

      const prevCount = Object.keys(state.page.shapes).length

      state.selectNone().copy(['rect1']).paste()

      expect(Object.keys(state.page.shapes).length).toBe(prevCount + 1)

      state.undo()

      expect(Object.keys(state.page.shapes).length).toBe(prevCount)

      state.redo()

      expect(Object.keys(state.page.shapes).length).toBe(prevCount + 1)
    })

    it('pastes a shape to a new page', () => {
      state.loadDocument(mockDocument)

      state.selectNone().copy(['rect1']).createPage().paste()

      expect(Object.keys(state.page.shapes).length).toBe(1)

      state.undo()

      expect(Object.keys(state.page.shapes).length).toBe(0)

      state.redo()

      expect(Object.keys(state.page.shapes).length).toBe(1)
    })

    it('Copies grouped shapes.', () => {
      const state = new TLDrawState()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .select('groupA')
        .copy()

      const beforeShapes = state.shapes

      state.paste()

      expect(state.shapes.filter((shape) => shape.type === TLDrawShapeType.Group).length).toBe(2)

      const afterShapes = state.shapes

      const newShapes = afterShapes.filter(
        (shape) => !beforeShapes.find(({ id }) => id === shape.id)
      )

      const newGroup = newShapes.find((shape) => shape.type === TLDrawShapeType.Group)

      const newChildIds = newShapes
        .filter((shape) => shape.type !== TLDrawShapeType.Group)
        .map((shape) => shape.id)

      expect(new Set(newGroup!.children)).toEqual(new Set(newChildIds))
    })

    it.todo("Pastes in to the top child index of the page's children.")

    it.todo('Pastes in the correct child index order.')
  })

  describe('When copying and pasting a shape with bindings', () => {
    it('copies two bound shapes and their binding', () => {
      const state = new TLDrawState()

      state
        .createShapes(
          { type: TLDrawShapeType.Rectangle, id: 'target1', point: [0, 0], size: [100, 100] },
          { type: TLDrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([55, 55])
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
      const state = new TLDrawState()

      state
        .createShapes(
          { type: TLDrawShapeType.Rectangle, id: 'target1', point: [0, 0], size: [100, 100] },
          { type: TLDrawShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .startSession(SessionType.Arrow, [200, 200], 'start')
        .updateSession([55, 55])
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
      state.loadDocument(mockDocument).selectNone()
      tlu.clickShape('rect1')
      expect(state.selectedIds).toStrictEqual(['rect1'])
      expect(state.appState.status).toBe('idle')
    })

    it('selects and deselects a shape', () => {
      state.loadDocument(mockDocument).selectNone()
      tlu.clickShape('rect1')
      tlu.clickCanvas()
      expect(state.selectedIds).toStrictEqual([])
      expect(state.appState.status).toBe('idle')
    })

    it('selects multiple shapes', () => {
      state.loadDocument(mockDocument).selectNone()
      tlu.clickShape('rect1')
      tlu.clickShape('rect2', { shiftKey: true })
      expect(state.selectedIds).toStrictEqual(['rect1', 'rect2'])
      expect(state.appState.status).toBe('idle')
    })

    it('shift-selects to deselect shapes', () => {
      state.loadDocument(mockDocument).selectNone()
      tlu.clickShape('rect1')
      tlu.clickShape('rect2', { shiftKey: true })
      tlu.clickShape('rect2', { shiftKey: true })
      expect(state.selectedIds).toStrictEqual(['rect1'])
      expect(state.appState.status).toBe('idle')
    })

    it('clears selection when clicking bounds', () => {
      state.loadDocument(mockDocument).selectNone()
      state.startSession(SessionType.Brush, [-10, -10])
      state.updateSession([110, 110])
      state.completeSession()
      expect(state.selectedIds.length).toBe(3)
    })

    it('selects selected shape when single-clicked', () => {
      state.loadDocument(mockDocument).selectAll()
      tlu.clickShape('rect2')
      expect(state.selectedIds).toStrictEqual(['rect2'])
    })

    // it('selects shape when double-clicked', () => {
    //   state.loadDocument(mockDocument).selectAll()
    //   tlu.doubleClickShape('rect2')
    //   expect(state.selectedIds).toStrictEqual(['rect2'])
    // })

    it('does not select on meta-click', () => {
      state.loadDocument(mockDocument).selectNone()
      tlu.clickShape('rect1', { ctrlKey: true })
      expect(state.selectedIds).toStrictEqual([])
      expect(state.appState.status).toBe('idle')
    })

    it.todo('deletes shapes if cancelled during creating')

    it.todo('deletes shapes on undo after creating')

    it.todo('re-creates shapes on redo after creating')

    describe('When selecting all', () => {
      it('selects all', () => {
        const state = new TLDrawState().loadDocument(mockDocument).selectAll()
        expect(state.selectedIds).toMatchSnapshot('selected all')
      })

      it('does not select children of a group', () => {
        const state = new TLDrawState().loadDocument(mockDocument).selectAll().group()
        expect(state.selectedIds.length).toBe(1)
      })
    })

    // Single click on a selected shape to select just that shape

    it('single-selects shape in selection on click', () => {
      state.selectNone()
      tlu.clickShape('rect1')
      tlu.clickShape('rect2', { shiftKey: true })
      tlu.clickShape('rect2')
      expect(state.selectedIds).toStrictEqual(['rect2'])
      expect(state.appState.status).toBe('idle')
    })

    it('single-selects shape in selection on pointerup only', () => {
      state.selectNone()
      tlu.clickShape('rect1')
      tlu.clickShape('rect2', { shiftKey: true })
      tlu.pointShape('rect2')
      expect(state.selectedIds).toStrictEqual(['rect1', 'rect2'])
      tlu.stopPointing('rect2')
      expect(state.selectedIds).toStrictEqual(['rect2'])
      expect(state.appState.status).toBe('idle')
    })

    // it('selects shapes if shift key is lifted before pointerup', () => {
    //   state.selectNone()
    //   tlu.clickShape('rect1')
    //   tlu.pointShape('rect2', { shiftKey: true })
    //   expect(state.appState.status).toBe('pointingBounds')
    //   tlu.stopPointing('rect2')
    //   expect(state.selectedIds).toStrictEqual(['rect2'])
    //   expect(state.appState.status).toBe('idle')
    // })
  })

  describe('Select history', () => {
    it('selects, undoes and redoes', () => {
      state.reset().loadDocument(mockDocument)

      expect(state.selectHistory.pointer).toBe(0)
      expect(state.selectHistory.stack).toStrictEqual([[]])
      expect(state.selectedIds).toStrictEqual([])

      tlu.pointShape('rect1')

      expect(state.selectHistory.pointer).toBe(1)
      expect(state.selectHistory.stack).toStrictEqual([[], ['rect1']])
      expect(state.selectedIds).toStrictEqual(['rect1'])

      tlu.stopPointing('rect1')

      expect(state.selectHistory.pointer).toBe(1)
      expect(state.selectHistory.stack).toStrictEqual([[], ['rect1']])
      expect(state.selectedIds).toStrictEqual(['rect1'])

      tlu.clickShape('rect2', { shiftKey: true })

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
    state.selectAll()
    expect(state.copyJson()).toMatchSnapshot('copied json')
  })

  describe('Mutates bound shapes', () => {
    const state = new TLDrawState()
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
      .startSession(SessionType.Arrow, [200, 200], 'start')
      .updateSession([10, 10])
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
      const state = new TLDrawState().loadDocument(mockDocument).group(['rect1', 'rect2'], 'groupA')

      const tlu = new TLDrawStateUtils(state)
      tlu.clickShape('rect1')
      expect((state.currentTool as SelectTool).selectedGroupId).toBeUndefined()
      expect(state.selectedIds).toStrictEqual(['groupA'])
    })

    it('selects the grouped shape when double clicked', () => {
      const state = new TLDrawState().loadDocument(mockDocument).group(['rect1', 'rect2'], 'groupA')

      const tlu = new TLDrawStateUtils(state)
      tlu.doubleClickShape('rect1')
      expect((state.currentTool as SelectTool).selectedGroupId).toStrictEqual('groupA')
      expect(state.selectedIds).toStrictEqual(['rect1'])
    })

    it('clears the selectedGroupId when selecting a different shape', () => {
      const state = new TLDrawState().loadDocument(mockDocument).group(['rect1', 'rect2'], 'groupA')

      const tlu = new TLDrawStateUtils(state)
      tlu.doubleClickShape('rect1')
      tlu.clickShape('rect3')
      expect((state.currentTool as SelectTool).selectedGroupId).toBeUndefined()
      expect(state.selectedIds).toStrictEqual(['rect3'])
    })

    it('selects a grouped shape when meta-shift-clicked', () => {
      const state = new TLDrawState()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .selectNone()

      const tlu = new TLDrawStateUtils(state)

      tlu.clickShape('rect1', { ctrlKey: true, shiftKey: true })
      expect(state.selectedIds).toStrictEqual(['rect1'])

      tlu.clickShape('rect1', { ctrlKey: true, shiftKey: true })
      expect(state.selectedIds).toStrictEqual([])
    })

    it('selects a hovered shape from the selected group when meta-shift-clicked', () => {
      const state = new TLDrawState().loadDocument(mockDocument).group(['rect1', 'rect2'], 'groupA')

      const tlu = new TLDrawStateUtils(state)

      tlu.clickShape('rect1', { ctrlKey: true, shiftKey: true })
      expect(state.selectedIds).toStrictEqual(['rect1'])

      tlu.clickShape('rect1', { ctrlKey: true, shiftKey: true })
      expect(state.selectedIds).toStrictEqual([])
    })
  })

  describe('when creating shapes', () => {
    it('Creates shapes with the correct child index', () => {
      const state = new TLDrawState()
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

      const tlu = new TLDrawStateUtils(state)

      const prevA = state.shapes.map((shape) => shape.id)

      tlu.pointCanvas({ x: 0, y: 0 })
      tlu.movePointer({ x: 100, y: 100 })
      tlu.stopPointing()

      const newIdA = state.shapes.map((shape) => shape.id).find((id) => !prevA.includes(id))!
      const shapeA = state.getShape(newIdA)
      expect(shapeA.childIndex).toBe(4)

      state.group(['rect2', 'rect3', newIdA], 'groupA')

      expect(state.getShape('groupA').childIndex).toBe(2)

      state.selectNone()
      state.selectTool(TLDrawShapeType.Rectangle)

      const prevB = state.shapes.map((shape) => shape.id)

      tlu.pointCanvas({ x: 0, y: 0 })
      tlu.movePointer({ x: 100, y: 100 })
      tlu.stopPointing()

      const newIdB = state.shapes.map((shape) => shape.id).find((id) => !prevB.includes(id))!
      const shapeB = state.getShape(newIdB)
      expect(shapeB.childIndex).toBe(3)
    })
  })

  it('Exposes undo/redo stack', () => {
    const state = new TLDrawState()
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
    const state = new TLDrawState()
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

    expect(state.history.length).toBe(1)
  })

  it('Sets the undo/redo history', () => {
    const state = new TLDrawState('some_state_a')
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
    const doc = state.document
    const history = state.history

    // Create a new state
    const state2 = new TLDrawState('some_state_b')

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
      const state = new TLDrawState()
      const result = state
        .loadDocument(mockDocument)
        .select('rect1')
        .rotate(0.1)
        .selectAll()
        .copySvg()
      expect(result).toMatchSnapshot('copied svg')
    })

    it('Copies grouped shapes.', () => {
      const state = new TLDrawState()
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
    //   const state2 = new TLDrawState()

    //   const svgString = state2
    //     .createShapes({
    //       id: 'text1',
    //       type: TLDrawShapeType.Text,
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

    When the `document` prop changes in the TLDraw component, we want
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
      const defaultState = TLDrawState.defaultState

      const withoutRoom = {
        ...defaultState,
      }

      delete withoutRoom.room

      TLDrawState.defaultState = withoutRoom

      const state = new TLDrawState('migrate_1')

      state.createShapes({
        id: 'rect1',
        type: TLDrawShapeType.Rectangle,
      })

      setTimeout(() => {
        // TODO: Force the version to change and restore room.
        TLDrawState.version = 100
        TLDrawState.defaultState.room = defaultState.room

        const state2 = new TLDrawState('migrate_1')

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
