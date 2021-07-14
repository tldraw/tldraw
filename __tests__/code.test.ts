import { generateFromCode } from 'state/code/generate'
import * as json from './__mocks__/document.json'
import TestState from './test-utils'

jest.useRealTimers()

const tt = new TestState()
tt.resetDocumentState()
  .send('LOADED_FROM_FILE', { json: JSON.stringify(json) })
  .send('CLEARED_PAGE')
  .save()

describe('selection', () => {
  it('opens and closes the code panel', () => {
    expect(tt.data.settings.isCodeOpen).toBe(false)
    tt.send('TOGGLED_CODE_PANEL_OPEN')
    expect(tt.data.settings.isCodeOpen).toBe(true)
    tt.send('TOGGLED_CODE_PANEL_OPEN')
    expect(tt.data.settings.isCodeOpen).toBe(false)
  })

  it('saves changes to code', () => {
    expect(tt.getSortedPageShapeIds().length).toBe(0)

    const code = `// hello world!`

    tt.send('SAVED_CODE', { code })

    expect(tt.data.document.code[tt.data.currentCodeFileId].code).toBe(code)
  })

  it('generates shapes', async () => {
    const code = `
    const rectangle = new Rectangle({
      id: "test-rectangle",
      name: 'Test Rectangle',
      point: [100, 100],
      size: [200, 200],
      style: {
        size: SizeStyle.Medium,
        color: ColorStyle.Red,
        dash: DashStyle.Dotted,
      },
    })
    `

    const { controls, shapes } = await generateFromCode(tt.data, code)

    tt.send('GENERATED_FROM_CODE', { controls, shapes })

    expect(tt.getShapes()).toMatchSnapshot('generated rectangle from code')
  })

  it('creates a code control', async () => {
    const code = `
    new NumberControl({
      id: "test-number-control",
      label: "x"
    })
    `

    const { controls, shapes } = await generateFromCode(tt.data, code)

    tt.send('GENERATED_FROM_CODE', { controls, shapes })

    expect(tt.data.codeControls).toMatchSnapshot(
      'generated code controls from code'
    )
  })

  it('updates a code control', async () => {
    const code = `
    new NumberControl({
      id: "test-number-control",
      label: "x"
    })

    new VectorControl({
      id: "test-vector-control",
      label: "size"
    })

    const rectangle = new Rectangle({
      id: "test-rectangle",
      name: 'Test Rectangle',
      point: [controls.x, 100],
      size: controls.size,
      style: {
        size: SizeStyle.Medium,
        color: ColorStyle.Red,
        dash: DashStyle.Dotted,
      },
    })
    `

    const { controls, shapes } = await generateFromCode(tt.data, code)

    tt.send('GENERATED_FROM_CODE', { controls, shapes })

    tt.send('CHANGED_CODE_CONTROL', { 'test-number-control': 100 })

    expect(tt.data.codeControls).toMatchSnapshot(
      'data in state after changing control'
    )

    expect(tt.getShape('test-rectangle')).toMatchSnapshot(
      'rectangle in state after changing code control'
    )
  })

  /* -------------------- Readonly -------------------- */

  it('does not saves changes to code when readonly', () => {
    tt.send('CLEARED_PAGE')

    expect(tt.getShapes().length).toBe(0)

    const code = `// hello world!`

    tt.send('SAVED_CODE', { code })
      .send('TOGGLED_READ_ONLY')
      .send('SAVED_CODE', { code: '' })

    expect(tt.data.document.code[tt.data.currentCodeFileId].code).toBe(code)

    tt.send('TOGGLED_READ_ONLY').send('SAVED_CODE', { code: '' })

    expect(tt.data.document.code[tt.data.currentCodeFileId].code).toBe('')
  })

  /* --------------------- Methods -------------------- */

  it('moves shape to front', async () => {
    null
  })

  it('moves shape forward', async () => {
    null
  })

  it('moves shape backward', async () => {
    null
  })

  it('moves shape to back', async () => {
    null
  })

  it('rotates a shape', async () => {
    null
  })

  it('rotates a shape by a delta', async () => {
    null
  })

  it('translates a shape', async () => {
    null
  })

  it('translates a shape by a delta', async () => {
    null
  })

  /* --------------------- Shapes --------------------- */

  it('generates a rectangle shape', async () => {
    tt.send('CLEARED_PAGE')
    const code = `
    const rectangle = new Rectangle({
      id: "test-rectangle",
      name: 'Test Rectangle',
      point: [100, 100],
      size: [200, 200],
      style: {
        size: SizeStyle.Medium,
        color: ColorStyle.Red,
        dash: DashStyle.Dotted,
      },
    })
    `

    const { controls, shapes } = await generateFromCode(tt.data, code)

    tt.send('GENERATED_FROM_CODE', { controls, shapes })

    expect(tt.getShapes()).toMatchSnapshot('generated rectangle from code')
  })

  it('changes a rectangle size', async () => {
    null
  })

  it('generates an ellipse shape', async () => {
    tt.send('CLEARED_PAGE')
    const code = `
    const ellipse = new Ellipse({
      id: 'test-ellipse',
      name: 'Test ellipse',
      point: [100, 100],
      radiusX: 100,
      radiusY: 200,
      style: {
        size: SizeStyle.Medium,
        color: ColorStyle.Red,
        dash: DashStyle.Dotted,
      },
    })
    `

    const { controls, shapes } = await generateFromCode(tt.data, code)

    tt.send('GENERATED_FROM_CODE', { controls, shapes })

    expect(tt.getShapes()).toMatchSnapshot('generated ellipse from code')
  })

  it('generates a draw shape', async () => {
    tt.send('CLEARED_PAGE')
    const code = `
    const ellipse = new Draw({
      id: 'test-draw',
      name: 'Test draw',
      points: [[100, 100], [200,200], [300,300]],
      style: {
        size: SizeStyle.Medium,
        color: ColorStyle.Red,
        dash: DashStyle.Dotted,
      },
    })
    `

    const { controls, shapes } = await generateFromCode(tt.data, code)

    tt.send('GENERATED_FROM_CODE', { controls, shapes })

    expect(tt.getShapes()).toMatchSnapshot('generated draw from code')
  })

  it('generates an arrow shape', async () => {
    tt.send('CLEARED_PAGE')
    const code = `
    const draw = new Arrow({
      id: 'test-draw',
      name: 'Test draw',
      points: [[100, 100], [200,200], [300,300]],
      style: {
        size: SizeStyle.Medium,
        color: ColorStyle.Red,
        dash: DashStyle.Dotted,
      },
    })
    `

    const { controls, shapes } = await generateFromCode(tt.data, code)

    tt.send('GENERATED_FROM_CODE', { controls, shapes })

    expect(tt.getShapes()).toMatchSnapshot('generated draw from code')
  })

  it('generates a text shape', async () => {
    tt.send('CLEARED_PAGE')
    const code = `
    const text = new Text({
      id: 'test-text',
      name: 'Test text',
      point: [100, 100],
      text: 'Hello world!',
      style: {
        size: SizeStyle.Large,
        color: ColorStyle.Red,
        dash: DashStyle.Dotted,
      },
    })
    `

    const { controls, shapes } = await generateFromCode(tt.data, code)

    tt.send('GENERATED_FROM_CODE', { controls, shapes })

    expect(tt.getShapes()).toMatchSnapshot('generated draw from code')
  })
})
