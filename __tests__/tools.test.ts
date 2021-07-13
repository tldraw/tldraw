import TestState from './test-utils'

const TOOLS = [
  'draw',
  'rectangle',
  'ellipse',
  'arrow',
  'text',
  'line',
  'ray',
  'dot',
]

describe('when selecting tools', () => {
  const tt = new TestState()

  TOOLS.forEach((tool) => {
    it(`selects ${tool} tool`, () => {
      tt.reset().send(`SELECTED_${tool.toUpperCase()}_TOOL`)

      expect(tt.data.activeTool).toBe(tool)
      expect(tt.state.isIn(tool)).toBe(true)
    })

    TOOLS.forEach((otherTool) => {
      if (otherTool === tool) return

      it(`selects ${tool} tool from ${otherTool} tool`, () => {
        tt.reset()
          .send(`SELECTED_${tool.toUpperCase()}_TOOL`)
          .send(`SELECTED_${otherTool.toUpperCase()}_TOOL`)

        expect(tt.data.activeTool).toBe(otherTool)
        expect(tt.state.isIn(otherTool)).toBe(true)
      })
    })
  })
})
