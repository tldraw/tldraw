import { createCss, defaultThemeMap } from "@stitches/react"

const { styled, global, css, theme, getCssString } = createCss({
  themeMap: {
    ...defaultThemeMap,
  },
  theme: {
    colors: {},
    space: {},
    fontSizes: {
      0: "10px",
      1: "12px",
      2: "13px",
      3: "16px",
      4: "18px",
    },
    fonts: {
      ui: `"Recursive", system-ui, sans-serif`,
    },
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
  "html, body": {
    padding: "0px",
    margin: "0px",
    overscrollBehavior: "none",
    fontFamily: "$ui",
    fontSize: "$2",
  },
})

export default styled

export { css, getCssString, globalStyles, light, dark }
