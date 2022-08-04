import type { RectangleShape } from '~types'
import { mockDocument, TldrawTestApp } from '~test'

describe('Toggle command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = app.state
      app.toggleHidden()
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    app.selectAll()

    expect(app.getShape('rect2').isLocked).toBe(undefined)

    app.toggleLocked()

    expect(app.getShape('rect2').isLocked).toBe(true)

    app.undo()

    expect(app.getShape('rect2').isLocked).toBe(undefined)

    app.redo()

    expect(app.getShape('rect2').isLocked).toBe(true)
  })

  it('toggles on before off when mixed values', () => {
    app.select('rect2')

    expect(app.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(undefined)
    expect(app.getShape<RectangleShape>('rect2').isAspectRatioLocked).toBe(undefined)

    app.toggleAspectRatioLocked()

    expect(app.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(undefined)
    expect(app.getShape<RectangleShape>('rect2').isAspectRatioLocked).toBe(true)

    app.selectAll()
    app.toggleAspectRatioLocked()

    expect(app.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(true)
    expect(app.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(true)

    app.toggleAspectRatioLocked()

    expect(app.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(false)
    expect(app.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(false)
  })
})

describe('when running the command', () => {
  it('restores selection on undo', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1')
      .toggleHidden()
      .selectNone()
      .undo()

    expect(app.selectedIds).toEqual(['rect1'])

    app.selectNone().redo()

    expect(app.selectedIds).toEqual(['rect1'])
  })
})
