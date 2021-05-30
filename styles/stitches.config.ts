import { createCss, defaultThemeMap } from '@stitches/react'

const { styled, global, css, theme, getCssString } = createCss({
  themeMap: {
    ...defaultThemeMap,
  },
  theme: {
    colors: {
      brushFill: 'rgba(0,0,0,.1)',
      brushStroke: 'rgba(0,0,0,.5)',
      hint: 'rgba(66, 133, 244, 0.200)',
      selected: 'rgba(66, 133, 244, 1.000)',
      bounds: 'rgba(65, 132, 244, 1.000)',
      boundsBg: 'rgba(65, 132, 244, 0.100)',
      border: '#aaa',
      panel: '#fefefe',
      inactive: '#cccccf',
      hover: '#efefef',
      text: '#333',
      input: '#f3f3f3',
      inputBorder: '#ddd',
    },
    space: {},
    fontSizes: {
      0: '10px',
      1: '12px',
      2: '13px',
      3: '16px',
      4: '18px',
    },
    fonts: {
      ui: '"Recursive", system-ui, sans-serif',
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
  media: {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
  },
  utils: {
    zDash: () => (value: number) => {
      return {
        strokeDasharray: `calc(${value}px / var(--camera-zoom)) calc(${value}px / var(--camera-zoom))`,
      }
    },
    zStrokeWidth: () => (value: number | number[]) => {
      if (Array.isArray(value)) {
        // const [val, min, max] = value
        // return {
        //   strokeWidth:
        //     min !== undefined && max !== undefined
        //       ? `clamp(${min}px, (calc(${val}px / var(--camera-zoom))), ${max}px)`
        //       : min !== undefined
        //       ? `min(${min}px, calc(${val}px / var(--camera-zoom)))`
        //       : `calc(${val}px / var(--camera-zoom))`,
        // }

        return {
          strokeWidth: `calc(${value[0]}px / var(--camera-zoom))`,
        }
      }

      return {
        strokeWidth: `calc(${value}px / var(--camera-zoom))`,
      }
    },
  },
})

const light = theme({})

const dark = theme({})

const globalStyles = global({
  '*': { boxSizing: 'border-box' },
  ':root': {
    '--camera-zoom': 1,
    '--scale': 'calc(1 / var(--camera-zoom))',
  },
  'html, body': {
    padding: '0px',
    margin: '0px',
    overscrollBehavior: 'none',
    fontFamily: '$ui',
    fontSize: '$2',
  },
})

export default styled

export { css, getCssString, globalStyles, light, dark }
