import state from 'state'
import { generateFromCode } from 'state/code/generate'
import { getShapes } from 'utils'
import * as json from './__mocks__/document.json'

jest.useRealTimers()

state.reset()
state.send('MOUNTED').send('LOADED_FROM_FILE', { json: JSON.stringify(json) })
state.send('CLEARED_PAGE')

describe('selection', () => {
  it('opens and closes the code panel', () => {
    expect(state.data.settings.isCodeOpen).toBe(false)
    state.send('TOGGLED_CODE_PANEL_OPEN')
    expect(state.data.settings.isCodeOpen).toBe(true)
    state.send('TOGGLED_CODE_PANEL_OPEN')
    expect(state.data.settings.isCodeOpen).toBe(false)
  })

  it('saves changes to code', () => {
    expect(getShapes(state.data).length).toBe(0)

    const code = `// hello world!`

    state.send('SAVED_CODE', { code })

    expect(state.data.document.code[state.data.currentCodeFileId].code).toBe(
      code
    )
  })

  it('generates shapes', async () => {
    const code = `
    const rectangle = new Rectangle({
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

    const { controls, shapes } = await generateFromCode(state.data, code)
    state.send('GENERATED_FROM_CODE', { controls, shapes })
    expect(getShapes(state.data).length).toBe(1)
  })

  it('creates a code control', () => {
    null
  })

  it('updates a code control', () => {
    null
  })

  it('updates a code control', () => {
    null
  })

  /* -------------------- Readonly -------------------- */

  it('does not saves changes to code when readonly', () => {
    null
  })
})
