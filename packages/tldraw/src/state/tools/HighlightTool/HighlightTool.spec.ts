import { TldrawApp } from '~state'
import { TldrawTestApp } from '~test'
import { TDShapeType } from '~types'
import { DrawTool } from '.'

describe('DrawTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new DrawTool(app)
  })
})

describe('When shift+clicking to extend a shape', () => {
  it('extends the same shape', () => {
    const app = new TldrawTestApp()
    app.reset()
    app.selectTool(TDShapeType.Draw)
    app.pointCanvas([0, 0])
    app.movePointer([100, 100])
    app.movePointer([200, 200])
    app.stopPointing()
    expect(app.shapes.length).toBe(1)
    app.pointCanvas({ x: 300, y: 300, shiftKey: true })
    app.movePointer([400, 400])
    app.stopPointing()
    expect(app.shapes.length).toBe(1)
  })

  it('does not extend after switching tools the same shape', () => {
    const app = new TldrawTestApp()
    app.reset()
    app.selectTool(TDShapeType.Draw)
    app.pointCanvas([0, 0])
    app.movePointer([100, 100])
    app.movePointer([200, 200])
    app.stopPointing()
    app.selectTool('select')
    app.selectTool(TDShapeType.Draw)
    app.pointCanvas({ x: 300, y: 300, shiftKey: true })
    app.movePointer([400, 400])
    app.stopPointing()
    expect(app.shapes.length).toBe(2)
  })

  it('does not extend after undo', () => {
    const app = new TldrawTestApp()
    app.reset()
    app.selectTool(TDShapeType.Draw)
    app.pointCanvas([0, 0])
    app.movePointer([100, 100])
    app.movePointer([200, 200])
    app.stopPointing()
    app.undo()
    app.pointCanvas({ x: 300, y: 300, shiftKey: true })
    app.movePointer([400, 400])
    app.stopPointing()
    expect(app.shapes.length).toBe(1)
  })

  it('does not extend if no shape is present', () => {
    const app = new TldrawTestApp()
    app.reset()
    app.selectTool(TDShapeType.Draw)
    app.pointCanvas({ x: 300, y: 300, shiftKey: true })
    app.movePointer([400, 400])
    app.stopPointing()
    expect(app.shapes.length).toBe(1)
  })
})
