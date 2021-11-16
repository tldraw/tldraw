import { TldrawTestApp } from '~test'
import { TldrawShapeType, TldrawStatus } from '~types'

describe('Draw session', () => {
  it('begins, updateSession', () => {
    const app = new TldrawTestApp()

    app
      .selectTool(TldrawShapeType.Draw)
      .pointCanvas([0, 0])
      .movePointer([10, 10, 0.5])
      .completeSession()

    const shape = app.shapes[0]

    expect(shape).toBeTruthy()

    expect(app.status).toBe(TldrawStatus.Idle)
  })

  it('does, undoes and redoes', () => {
    const app = new TldrawTestApp()

    app
      .selectTool(TldrawShapeType.Draw)
      .pointCanvas([0, 0])
      .movePointer([10, 10, 0.5])
      .completeSession()

    const shape = app.shapes[0]

    expect(app.getShape(shape.id)).toBeTruthy()

    app.undo()

    expect(app.getShape(shape.id)).toBe(undefined)

    app.redo()

    expect(app.getShape(shape.id)).toBeTruthy()
  })
})
