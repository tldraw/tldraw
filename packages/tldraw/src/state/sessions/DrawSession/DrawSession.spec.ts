import { TldrawTestApp } from '~test'
import { TldrawShapeType, TldrawStatus } from '~types'

describe('Draw session', () => {
  it('begins, updateSession', () => {
    const state = new TldrawTestApp()

    state
      .selectTool(TldrawShapeType.Draw)
      .pointCanvas([0, 0])
      .movePointer([10, 10, 0.5])
      .completeSession()

    const shape = state.shapes[0]

    expect(shape).toBeTruthy()

    expect(state.appState.status).toBe(TldrawStatus.Idle)
  })

  it('does, undoes and redoes', () => {
    const state = new TldrawTestApp()

    state
      .selectTool(TldrawShapeType.Draw)
      .pointCanvas([0, 0])
      .movePointer([10, 10, 0.5])
      .completeSession()

    const shape = state.shapes[0]

    expect(state.getShape(shape.id)).toBeTruthy()

    state.undo()

    expect(state.getShape(shape.id)).toBe(undefined)

    state.redo()

    expect(state.getShape(shape.id)).toBeTruthy()
  })
})
