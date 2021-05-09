import { createCss, global } from "@stitches/react"

const { styled, css, theme } = createCss({
  theme: {
    colors: {},
    space: {},
    fontSizes: {},
    fonts: {},
    fontWeights: {},
    lineHeights: {},
    letterSpacings: {},
    sizes: {},
    borderWidths: {},
    borderStyles: {},
    radii: {},
    shadows: {},
    zIndices: {},
    transitions: {},
  },
})

const light = theme({})

const dark = theme({})

const globalStyles = global({
  "*": { boxSizing: "border-box" },
})

export default styled

export { css, globalStyles, light, dark }
