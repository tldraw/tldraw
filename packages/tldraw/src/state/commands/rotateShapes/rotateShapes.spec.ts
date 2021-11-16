import { mockDocument, TldrawTestApp } from '~test'

describe('Rotate command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = app.state
      app.rotate()
      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    app.select('rect1')

    expect(app.getShape('rect1').rotation).toBe(undefined)

    app.rotate()

    expect(app.getShape('rect1').rotation).toBe(Math.PI * (6 / 4))

    app.undo()

    expect(app.getShape('rect1').rotation).toBe(undefined)

    app.redo()

    expect(app.getShape('rect1').rotation).toBe(Math.PI * (6 / 4))
  })

  it.todo('Rotates several shapes at once.')

  it.todo('Rotates shapes with handles.')
})

describe('when running the command', () => {
  it('restores selection on undo', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1')
      .rotate()
      .selectNone()
      .undo()

    expect(app.selectedIds).toEqual(['rect1'])

    app.selectNone().redo()

    expect(app.selectedIds).toEqual(['rect1'])
  })
})
