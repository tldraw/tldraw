import { TldrawTestApp } from '~test'
import {
  ColorStyle,
  DashStyle,
  SessionType,
  SizeStyle,
  TDDocument,
  TDShapeType,
  TextShape,
} from '~types'

const textDoc: TDDocument = {
  version: 0,
  id: 'doc',
  name: 'New Document',
  pages: {
    page1: {
      id: 'page1',
      shapes: {
        text1: {
          id: 'text1',
          parentId: 'page1',
          name: 'Text',
          childIndex: 1,
          type: TDShapeType.Text,
          point: [0, 0],
          text: 'Hello',
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
          label: '',
        },
      },
      bindings: {},
    },
  },
  pageStates: {
    page1: {
      id: 'page1',
      selectedIds: [],
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    },
  },
  assets: {},
}

describe('When creating a shape...', () => {
  it('begins, updateSession', () => {
    const app = new TldrawTestApp().selectTool(TDShapeType.Text).doubleClickCanvas()

    // We should be in the editing session
    expect(app.session?.type).toBe(SessionType.Edit)

    // We should be able to edit the shape
    const id = app.shapes[0].id

    app.onShapeChange({
      id,
      text: 'Hello',
    })

    expect(app.getShape<TextShape>(id).text).toBe('Hello')
  })

  it('cancels session', () => {
    const app = new TldrawTestApp().selectTool(TDShapeType.Text).doubleClickCanvas()

    const id = app.shapes[0].id

    app
      .onShapeChange({
        id,
        text: 'Hello',
      })
      .cancel()

    // Removes the editing shape
    expect(app.session?.type).toBeUndefined()
    expect(app.getShape(id)).toBeUndefined()

    // The shape was never added to the undo stack
    app.undo()
    expect(app.getShape(id)).toBeUndefined()
    app.redo()
    expect(app.getShape(id)).toBeUndefined()
  })

  it('completes session', () => {
    const app = new TldrawTestApp().selectTool(TDShapeType.Text).doubleClickCanvas()

    const id = app.shapes[0].id

    app
      .onShapeChange({
        id,
        text: 'Hello',
      })
      .completeSession()

    // Removes the editing shape
    expect(app.session?.type).toBeUndefined()
    expect(app.getShape(id)).toBeDefined()

    // The shape was never added to the undo stack
    app.undo()
    expect(app.getShape(id)).toBeUndefined()

    // The shape was added to the undo stack
    app.redo()
    expect(app.getShape(id)).toBeDefined()
  })
})

describe('When editing an existing a shape...', () => {
  it('begins, updateSession', () => {
    const app = new TldrawTestApp().loadDocument(textDoc)

    app.doubleClickShape('text1')

    expect(app.session?.type).toBe(SessionType.Edit)
  })

  it('cancels session', () => {
    const app = new TldrawTestApp()
      .loadDocument(textDoc)

      .doubleClickShape('text1')
      .onShapeChange({
        id: 'text1',
        text: 'Hello World!',
      })
      .cancel()

    // Cancelling will cancel the session and restore the original text
    expect(app.session?.type).toBeUndefined()
    expect(app.getShape<TextShape>('text1').text).toBe('Hello')

    // The changes were never added to the undo stack
    app.undo()
    expect(app.getShape<TextShape>('text1').text).toBe('Hello')

    // The redo will restore the shape
    app.redo()
    expect(app.getShape<TextShape>('text1').text).toBe('Hello')
  })

  it('completes session', () => {
    const app = new TldrawTestApp()
      .loadDocument(textDoc)
      .doubleClickShape('text1')
      .onShapeChange({
        id: 'text1',
        text: 'Hello World!',
      })
      .completeSession()

    // Cancelling will cancel the session and restore the original text
    expect(app.session?.type).toBeUndefined()
    expect(app.getShape<TextShape>('text1').text).toBe('Hello World!')

    // The changes were never added to the undo stack
    app.undo()
    expect(app.getShape<TextShape>('text1').text).toBe('Hello')

    // The redo will restore the shape
    app.redo()
    expect(app.getShape<TextShape>('text1').text).toBe('Hello World!')
  })
})
