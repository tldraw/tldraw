import { TldrawTestApp } from '~test'
import { HighlightShape, TDShapeType, TDStatus } from '~types'

describe('Highlight session', () => {
  it('begins, updateSession', () => {
    const app = new TldrawTestApp()

    app
      .selectTool(TDShapeType.Highlight)
      .pointCanvas([0, 0])
      .movePointer([10, 10, 0.5])
      .completeSession()

    const shape = app.shapes[0]

    expect(shape).toBeTruthy()

    expect(app.status).toBe(TDStatus.Idle)
  })

  it('does, undoes and redoes', () => {
    const app = new TldrawTestApp()

    app
      .selectTool(TDShapeType.Highlight)
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

describe('When Highlight drawing...', () => {
  it('Creates pressure data if not present', () => {
    const app = new TldrawTestApp().reset()
    app
      .selectTool(TDShapeType.Highlight)
      .pointCanvas([0, 0])
      .movePointer([1, 0])
      .movePointer([2, 0])
      .movePointer([4, 0])
      .movePointer([8, 0])
      .movePointer([16, 0])
      .movePointer([24, 0])
      .completeSession()
    const shape = app.shapes[0] as HighlightShape
    expect(shape.type).toBe(TDShapeType.Highlight)
    expect(shape.points).toMatchObject([
      [0, 0, 0.5],
      [0, 0, 0.5],
      [1, 0, 0.5],
      [2, 0, 0.5],
      [4, 0, 0.5],
      [8, 0, 0.5],
      [16, 0, 0.5],
      [24, 0, 0.5],
    ])
  })

  it('Uses pressure data if present', () => {
    const app = new TldrawTestApp().reset()
    app
      .selectTool(TDShapeType.Highlight)
      .pointCanvas([0, 0, 0.1])
      .movePointer([1, 0, 0.2])
      .movePointer([2, 0, 0.3])
      .movePointer([4, 0, 0.4])
      .movePointer([8, 0, 0.5])
      .movePointer([16, 0, 0.6])
      .movePointer([24, 0, 0.7])
      .completeSession()
    const shape = app.shapes[0] as HighlightShape
    expect(shape.type).toBe(TDShapeType.Highlight)
    expect(shape.points).toMatchObject([
      [0, 0, 0.1],
      [0, 0, 0.1],
      [1, 0, 0.2],
      [2, 0, 0.3],
      [4, 0, 0.4],
      [8, 0, 0.5],
      [16, 0, 0.6],
      [24, 0, 0.7],
    ])
  })
})
