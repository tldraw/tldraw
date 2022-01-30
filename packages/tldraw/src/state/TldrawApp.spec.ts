/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { mockDocument, TldrawTestApp } from '~test'
import { ArrowShape, ColorStyle, SessionType, TDShapeType } from '~types'
import type { SelectTool } from './tools/SelectTool'

describe('TldrawTestApp', () => {
  describe('When copying and pasting...', () => {
    it('copies a shape', () => {
      new TldrawTestApp().loadDocument(mockDocument).selectNone().copy(['rect1'])
    })

    it('pastes a shape', () => {
      const app = new TldrawTestApp().loadDocument(mockDocument)

      const prevCount = Object.keys(app.page.shapes).length

      app.selectNone().copy(['rect1']).paste()

      expect(Object.keys(app.page.shapes).length).toBe(prevCount + 1)

      app.undo()

      expect(Object.keys(app.page.shapes).length).toBe(prevCount)

      app.redo()

      expect(Object.keys(app.page.shapes).length).toBe(prevCount + 1)
    })

    it('pastes a shape to a new page', () => {
      const app = new TldrawTestApp().loadDocument(mockDocument)

      app.selectNone().copy(['rect1']).createPage().paste()

      expect(Object.keys(app.page.shapes).length).toBe(1)

      app.undo()

      expect(Object.keys(app.page.shapes).length).toBe(0)

      app.redo()

      expect(Object.keys(app.page.shapes).length).toBe(1)
    })

    it.todo('Copies and pastes a shape with an asset')

    it('Copies grouped shapes.', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .select('groupA')
        .copy()

      const beforeShapes = app.shapes

      app.paste()

      expect(app.shapes.filter((shape) => shape.type === TDShapeType.Group).length).toBe(2)

      const afterShapes = app.shapes

      const newShapes = afterShapes.filter(
        (shape) => !beforeShapes.find(({ id }) => id === shape.id)
      )

      const newGroup = newShapes.find((shape) => shape.type === TDShapeType.Group)

      const newChildIds = newShapes
        .filter((shape) => shape.type !== TDShapeType.Group)
        .map((shape) => shape.id)

      expect(new Set(newGroup!.children)).toEqual(new Set(newChildIds))
    })

    it.todo("Pastes in to the top child index of the page's children.")

    it.todo('Pastes in the correct child index order.')
  })

  describe('When copying and pasting a shape with bindings', () => {
    it('copies two bound shapes and their binding', () => {
      const app = new TldrawTestApp()

      app
        .createShapes(
          { type: TDShapeType.Rectangle, id: 'target1', point: [0, 0], size: [100, 100] },
          { type: TDShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([55, 55])
        .completeSession()

      expect(app.bindings.length).toBe(1)

      app.selectAll().copy().paste()

      const newArrow = app.shapes.sort((a, b) => b.childIndex - a.childIndex)[0] as ArrowShape

      expect(newArrow.handles.start.bindingId).not.toBe(
        app.getShape<ArrowShape>('arrow1').handles.start.bindingId
      )

      expect(app.bindings.length).toBe(2)
    })

    it('removes bindings from copied shape handles', () => {
      const app = new TldrawTestApp()

      app
        .createShapes(
          { type: TDShapeType.Rectangle, id: 'target1', point: [0, 0], size: [100, 100] },
          { type: TDShapeType.Arrow, id: 'arrow1', point: [200, 200] }
        )
        .select('arrow1')
        .movePointer([200, 200])
        .startSession(SessionType.Arrow, 'arrow1', 'start')
        .movePointer([55, 55])
        .completeSession()

      expect(app.bindings.length).toBe(1)

      expect(app.getShape<ArrowShape>('arrow1').handles.start.bindingId).toBeDefined()

      app.select('arrow1').copy().paste()

      const newArrow = app.shapes.sort((a, b) => b.childIndex - a.childIndex)[0] as ArrowShape

      expect(newArrow.handles.start.bindingId).toBeUndefined()
    })
  })

  describe('Selection', () => {
    it('selects a shape', () => {
      const app = new TldrawTestApp().loadDocument(mockDocument).selectNone().clickShape('rect1')
      expect(app.selectedIds).toStrictEqual(['rect1'])
      expect(app.status).toBe('idle')
    })

    it('selects and deselects a shape', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .selectNone()
        .clickShape('rect1')
        .clickCanvas()
      expect(app.selectedIds).toStrictEqual([])
      expect(app.status).toBe('idle')
    })

    it('selects multiple shapes', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .selectNone()
        .clickShape('rect1')
        .clickShape('rect2', { shiftKey: true })
      expect(app.selectedIds).toStrictEqual(['rect1', 'rect2'])
      expect(app.status).toBe('idle')
    })

    it('shift-selects to deselect shapes', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .selectNone()
        .clickShape('rect1')
        .clickShape('rect2', { shiftKey: true })
        .clickShape('rect2', { shiftKey: true })
      expect(app.selectedIds).toStrictEqual(['rect1'])
      expect(app.status).toBe('idle')
    })

    it('clears selection when clicking bounds', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .selectAll()
        .clickBounds()
        .completeSession()
      expect(app.selectedIds.length).toBe(0)
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
    //   app.loadDocument(mockDocument).selectAll()
    //   .doubleClickShape('rect2')
    //   expect(app.selectedIds).toStrictEqual(['rect2'])
    // })

    it('does not select on meta-click', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .selectNone()
        .clickShape('rect1', { ctrlKey: true })
        .expectSelectedIdsToBe([])

      expect(app.status).toBe('idle')
    })

    it.todo('deletes shapes if cancelled during creating')

    it.todo('deletes shapes on undo after creating')

    it.todo('re-creates shapes on redo after creating')

    describe('When selecting all', () => {
      it('selects all', () => {
        const app = new TldrawTestApp().loadDocument(mockDocument).selectAll()
        expect(app.selectedIds).toMatchSnapshot('selected all')
      })

      it('does not select children of a group', () => {
        const app = new TldrawTestApp().loadDocument(mockDocument).selectAll().group()
        expect(app.selectedIds.length).toBe(1)
      })
    })

    // Single click on a selected shape to select just that shape

    it('single-selects shape in selection on click', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .clickShape('rect1')
        .clickShape('rect2', { shiftKey: true })
        .clickShape('rect2')
      expect(app.selectedIds).toStrictEqual(['rect2'])
      expect(app.status).toBe('idle')
    })

    it('single-selects shape in selection on pointerup only', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .clickShape('rect1')
        .clickShape('rect2', { shiftKey: true })
        .pointShape('rect2')
      expect(app.selectedIds).toStrictEqual(['rect1', 'rect2'])
      app.stopPointing('rect2')
      expect(app.selectedIds).toStrictEqual(['rect2'])
      expect(app.status).toBe('idle')
    })

    // it('selects shapes if shift key is lifted before pointerup', () => {
    //   app.selectNone()
    //   .clickShape('rect1')
    //   .pointShape('rect2', { shiftKey: true })
    //   expect(app.status).toBe('pointingBounds')
    //   .stopPointing('rect2')
    //   expect(app.selectedIds).toStrictEqual(['rect2'])
    //   expect(app.status).toBe('idle')
    // })
  })

  describe('Select history', () => {
    it('selects, undoes and redoes', () => {
      const app = new TldrawTestApp().loadDocument(mockDocument)

      expect(app.selectHistory.pointer).toBe(0)
      expect(app.selectHistory.stack).toStrictEqual([[]])
      expect(app.selectedIds).toStrictEqual([])
      app.pointShape('rect1')

      expect(app.selectHistory.pointer).toBe(1)
      expect(app.selectHistory.stack).toStrictEqual([[], ['rect1']])
      expect(app.selectedIds).toStrictEqual(['rect1'])

      app.stopPointing('rect1')

      expect(app.selectHistory.pointer).toBe(1)
      expect(app.selectHistory.stack).toStrictEqual([[], ['rect1']])
      expect(app.selectedIds).toStrictEqual(['rect1'])

      app.clickShape('rect2', { shiftKey: true })

      expect(app.selectHistory.pointer).toBe(2)
      expect(app.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect1', 'rect2']])
      expect(app.selectedIds).toStrictEqual(['rect1', 'rect2'])

      app.undoSelect()

      expect(app.selectHistory.pointer).toBe(1)
      expect(app.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect1', 'rect2']])
      expect(app.selectedIds).toStrictEqual(['rect1'])

      app.undoSelect()

      expect(app.selectHistory.pointer).toBe(0)
      expect(app.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect1', 'rect2']])
      expect(app.selectedIds).toStrictEqual([])

      app.redoSelect()

      expect(app.selectHistory.pointer).toBe(1)
      expect(app.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect1', 'rect2']])
      expect(app.selectedIds).toStrictEqual(['rect1'])

      app.select('rect2')

      expect(app.selectHistory.pointer).toBe(2)
      expect(app.selectHistory.stack).toStrictEqual([[], ['rect1'], ['rect2']])
      expect(app.selectedIds).toStrictEqual(['rect2'])

      app.delete()

      expect(app.selectHistory.pointer).toBe(0)
      expect(app.selectHistory.stack).toStrictEqual([[]])
      expect(app.selectedIds).toStrictEqual([])

      app.undoSelect()

      expect(app.selectHistory.pointer).toBe(0)
      expect(app.selectHistory.stack).toStrictEqual([[]])
      expect(app.selectedIds).toStrictEqual([])
    })
  })

  describe('Copies to JSON', () => {
    const app = new TldrawTestApp().loadDocument(mockDocument).selectAll()
    expect(app.copyJson()).toMatchSnapshot('copied json')
  })

  describe('Mutates bound shapes', () => {
    const app = new TldrawTestApp()
      .createShapes(
        {
          id: 'rect',
          point: [0, 0],
          size: [100, 100],
          childIndex: 1,
          type: TDShapeType.Rectangle,
        },
        {
          id: 'arrow',
          point: [200, 200],
          childIndex: 2,
          type: TDShapeType.Arrow,
        }
      )
      .select('arrow')
      .movePointer([200, 200])
      .startSession(SessionType.Arrow, 'arrow', 'start')
      .movePointer([10, 10])
      .completeSession()

    expect(app.bindings.length).toBe(1)

    app.selectAll().style({ color: ColorStyle.Red })

    expect(app.getShape('arrow').style.color).toBe(ColorStyle.Red)
    expect(app.getShape('rect').style.color).toBe(ColorStyle.Red)

    app.undo()

    expect(app.getShape('arrow').style.color).toBe(ColorStyle.Black)
    expect(app.getShape('rect').style.color).toBe(ColorStyle.Black)

    app.redo()

    expect(app.getShape('arrow').style.color).toBe(ColorStyle.Red)
    expect(app.getShape('rect').style.color).toBe(ColorStyle.Red)
  })

  describe('when selecting shapes in a group', () => {
    it('selects the group when a grouped shape is clicked', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .clickShape('rect1')

      expect((app.currentTool as SelectTool).selectedGroupId).toBeUndefined()
      expect(app.selectedIds).toStrictEqual(['groupA'])
    })

    it('selects the grouped shape when double clicked', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .doubleClickShape('rect1')

      expect((app.currentTool as SelectTool).selectedGroupId).toStrictEqual('groupA')
      expect(app.selectedIds).toStrictEqual(['rect1'])
    })

    it('clears the selectedGroupId when selecting a different shape', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .doubleClickShape('rect1')
        .clickShape('rect3')

      expect((app.currentTool as SelectTool).selectedGroupId).toBeUndefined()
      expect(app.selectedIds).toStrictEqual(['rect3'])
    })

    it('selects a grouped shape when meta-shift-clicked', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .selectNone()
        .clickShape('rect1', { ctrlKey: true, shiftKey: true })

      expect(app.selectedIds).toStrictEqual(['rect1'])

      app.clickShape('rect1', { ctrlKey: true, shiftKey: true })

      expect(app.selectedIds).toStrictEqual([])
    })

    it('selects a hovered shape from the selected group when meta-shift-clicked', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'groupA')
        .clickShape('rect1', { ctrlKey: true, shiftKey: true })

      expect(app.selectedIds).toStrictEqual(['rect1'])

      app.clickShape('rect1', { ctrlKey: true, shiftKey: true })

      expect(app.selectedIds).toStrictEqual([])
    })
  })

  describe('when creating shapes', () => {
    it('Creates shapes with the correct child index', () => {
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
        .selectTool(TDShapeType.Rectangle)

      const prevA = app.shapes.map((shape) => shape.id)

      app.pointCanvas({ x: 0, y: 0 }).movePointer({ x: 100, y: 100 }).stopPointing()

      const newIdA = app.shapes.map((shape) => shape.id).find((id) => !prevA.includes(id))!
      const shapeA = app.getShape(newIdA)
      expect(shapeA.childIndex).toBe(4)

      app.group(['rect2', 'rect3', newIdA], 'groupA')

      expect(app.getShape('groupA').childIndex).toBe(2)

      app.selectNone()
      app.selectTool(TDShapeType.Rectangle)

      const prevB = app.shapes.map((shape) => shape.id)

      app.pointCanvas({ x: 0, y: 0 }).movePointer({ x: 100, y: 100 }).stopPointing()

      const newIdB = app.shapes.map((shape) => shape.id).find((id) => !prevB.includes(id))!
      const shapeB = app.getShape(newIdB)
      expect(shapeB.childIndex).toBe(3)
    })
  })

  it('Exposes undo/redo stack', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'rect1',
        type: TDShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })
      .createShapes({
        id: 'rect2',
        type: TDShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })

    expect(app.history.length).toBe(2)

    expect(app.history).toBeDefined()
    expect(app.history).toMatchSnapshot('history')

    app.history = []
    expect(app.history).toEqual([])

    const before = app.state
    app.undo()
    const after = app.state

    expect(before).toBe(after)
  })

  it('Exposes undo/redo stack up to the current pointer', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'rect1',
        type: TDShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })
      .createShapes({
        id: 'rect2',
        type: TDShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })
      .undo()

    expect(app.history.length).toBe(1)
  })

  it('Sets the undo/redo history', () => {
    const app = new TldrawTestApp('some_state_a')
      .createShapes({
        id: 'rect1',
        type: TDShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })
      .createShapes({
        id: 'rect2',
        type: TDShapeType.Rectangle,
        point: [0, 0],
        size: [100, 200],
      })

    // Save the history and document from the first state
    const doc = app.document
    const history = app.history

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
      const result = new TldrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1')
        .rotate(0.1)
        .selectAll()
        .copySvg()
      expect(result).toMatchSnapshot('copied svg')
    })

    it('Copies grouped shapes.', () => {
      const result = new TldrawTestApp()
        .loadDocument(mockDocument)
        .select('rect1', 'rect2')
        .group()
        .selectAll()
        .copySvg()

      expect(result).toMatchSnapshot('copied svg with group')
    })

    it('Respects child index', () => {
      const result = new TldrawTestApp()
        .loadDocument(mockDocument)
        .moveToBack(['rect2'])
        .selectAll()
        .copySvg()

      expect(result).toMatchSnapshot('copied svg with reordered elements')
    })

    it('Copies Text shapes as <text> elements.', () => {
      const state2 = new TldrawTestApp()

      const svgString = state2
        .createShapes({
          id: 'text1',
          type: TDShapeType.Text,
          text: 'hello world!',
        })
        .select('text1')
        .copySvg()

      expect(svgString).toBeTruthy()
    })
  })

  describe('when the document prop changes', () => {
    it.todo('replaces the document if the ids are different')

    it.todo('updates the document if the new id is the same as the old one')
  })
  /*
    We want to be able to use the `document` property to update the
    document without blowing out the current app. For example, we
    may want to patch in changes that occurred from another user.

    When the `document` prop changes in the Tldraw component, we want
    to update the document in a way that preserves the identity of as
    much as possible, while still protecting against invalid states.

    If this isn't possible, then we should guide the developer to
    instead use a helper like `patchDocument` to update the document.

    If the `id` property of the new document is the same as the
    previous document, then we call `updateDocument`. Otherwise, we
    call `replaceDocument`, which does a harder reset of the state's
    internal app.
  */

  jest.setTimeout(10000)

  describe('When changing versions', () => {
    it('migrates correctly', async () => {
      const defaultState = TldrawTestApp.defaultState
      const withoutRoom = {
        ...defaultState,
      }
      delete withoutRoom.room
      TldrawTestApp.defaultState = withoutRoom
      const app = new TldrawTestApp('migrate_1')
      await app.ready
      app.createShapes({
        id: 'rect1',
        type: TDShapeType.Rectangle,
      })
      TldrawTestApp.version = 100
      TldrawTestApp.defaultState.room = defaultState.room
      const app2 = new TldrawTestApp('migrate_1')
      await app2.ready
      expect(app2.getShape('rect1')).toBeTruthy()
      return
    })
  })

  describe('When replacing the page content', () => {
    it('Should update the page with the correct shapes and bindings.', () => {
      const shapes = mockDocument.pages.page1.shapes
      const bindings = mockDocument.pages.page1.bindings
      const app = new TldrawTestApp('multiplayer', {
        onChangePage: () => {
          //
        },
      }).createPage()
      app.replacePageContent(shapes, bindings, {})

      expect(app.shapes).toEqual(Object.values(shapes))
      expect(app.bindings).toEqual(Object.values(bindings))
    })

    it('It should update the page shapes after the settings have been updated', () => {
      const shapes = mockDocument.pages.page1.shapes
      const bindings = mockDocument.pages.page1.bindings
      const app = new TldrawTestApp('multiplayer', {
        onChangePage: () => {
          //
        },
      }).createPage()
      app.setSetting('isDebugMode', true)
      app.replacePageContent(shapes, bindings, {})

      expect(app.shapes).toEqual(Object.values(shapes))
      expect(app.bindings).toEqual(Object.values(bindings))
    })
  })

  describe('When selecting a box', () => {
    const app = new TldrawTestApp()
    app
      .createShapes({ id: 'box1', type: TDShapeType.Rectangle, point: [0, 0], size: [100, 100] })
      .pointCanvas([-50, 20])
      .movePointer([50, 50])
      .movePointer([50, 51])
      .expectSelectedIdsToBe(['box1'])
  })
})

describe('When adding an image', () => {
  it.todo('Adds the image to the assets table')
  it.todo('Does not add the image if that image already exists as an asset')
})

describe('When adding a video', () => {
  it.todo('Adds the video to the assets table')
  it.todo('Does not add the video if that video already exists as an asset')
})

describe('When space panning', () => {
  it('pans camera when spacebar is down', () => {
    const app = new TldrawTestApp()
    expect(app.pageState.camera.point).toMatchObject([0, 0])
    app.movePointer([0, 0])
    app.pointCanvas([0, 0])
    app.pressKey(' ')
    expect(app.isForcePanning).toBe(true)
    expect(app.isPointing).toBe(true)
    expect(app.currentTool.status).toBe('pointingCanvas')
    app.movePointer([100, 100])
    // Should not change to "brushing"
    expect(app.currentTool.status).toBe('pointingCanvas')
    app.releaseKey(' ')
    app.stopPointing()
    expect(app.pageState.camera.point).toMatchObject([100, 100])
  })

  it('pans camera in any state', () => {
    const app = new TldrawTestApp()
    app.selectTool(TDShapeType.Rectangle)
    expect(app.pageState.camera.point).toMatchObject([0, 0])
    app.movePointer([0, 0])
    app.pointCanvas([0, 0])
    app.movePointer([100, 100])
    expect(app.currentTool.status).toBe('creating')
    expect(app.isForcePanning).toBe(false)
    expect(app.isPointing).toBe(true)
    app.pressKey(' ')
    expect(app.isForcePanning).toBe(true)
    expect(app.isPointing).toBe(true)
    app.movePointer([200, 200])
    expect(app.pageState.camera.point).toMatchObject([100, 100])
    expect(app.currentTool.status).toBe('creating')
    app.releaseKey(' ')
    app.stopPointing()
    expect(app.currentTool.status).toBe('idle')
  })
})
