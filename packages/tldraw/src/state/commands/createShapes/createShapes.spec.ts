import { mockDocument, TldrawTestApp } from '~test'

describe('Create command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  describe('when no shape is provided', () => {
    it('does nothing', () => {
      const initialState = app.state
      app.create()

      const currentState = app.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    const shape = { ...app.getShape('rect1'), id: 'rect4' }
    app.create([shape])

    expect(app.getShape('rect4')).toBeTruthy()

    app.undo()

    expect(app.getShape('rect4')).toBe(undefined)

    app.redo()

    expect(app.getShape('rect4')).toBeTruthy()
  })

  it.todo('Creates bindings')
})
