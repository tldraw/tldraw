import { createStitches, defaultThemeMap } from '@stitches/react'

const { styled, createTheme } = createStitches({
  themeMap: {
    ...defaultThemeMap,
  },
  theme: {
    colors: {
      codeHl: 'rgba(144, 144, 144, .15)',
      brushFill: 'rgba(0,0,0,.05)',
      brushStroke: 'rgba(0,0,0,.25)',
      hint: 'rgba(216, 226, 249, 1.000)',
      selected: 'rgba(66, 133, 244, 1.000)',
      bounds: 'rgba(65, 132, 244, 1.000)',
      boundsBg: 'rgba(65, 132, 244, 0.05)',
      highlight: 'rgba(65, 132, 244, 0.15)',
      overlay: 'rgba(0, 0, 0, 0.15)',
      overlayContrast: 'rgba(255, 255, 255, 0.15)',
      border: 'rgba(143, 146, 148, 1)',
      focused: 'rgb(143, 146, 148, .35)',
      blurred: 'rgb(143, 146, 148, .15)',
      canvas: '#f8f9fa',
      panel: '#fefefe',
      panelBorder: 'rgba(0, 0, 0, 0.12)',
      panelActive: '#fefefe',
      inactive: '#cccccf',
      hover: 'rgba(144, 144, 144, .1)',
      text: '#333333',
      tooltipBg: '#1d1d1d',
      tooltipText: '#ffffff',
      muted: '#777777',
      input: '#f3f3f3',
      inputBorder: '#dddddd',
      warn: 'rgba(255, 100, 100, 1)',
      lineError: 'rgba(255, 0, 0, .1)',
      sponsor: '#ec6cb9',
      sponsorLight: '#ec6cb944',
    },
    shadows: {
      2: '0px 1px 1px rgba(0, 0, 0, 0.14)',
      3: '0px 2px 3px rgba(0, 0, 0, 0.14)',
      4: '0px 4px 5px -1px rgba(0, 0, 0, 0.14)',
      8: '0px 12px 17px rgba(0, 0, 0, 0.14)',
      12: '0px 12px 17px rgba(0, 0, 0, 0.14)',
      24: '0px 24px 38px rgba(0, 0, 0, 0.14)',
      key: '1px 1px rgba(0,0,0,1)',
      panel: `0px 0px 16px -1px rgba(0, 0, 0, 0.05), 
        0px 0px 16px -8px rgba(0, 0, 0, 0.05), 
        0px 0px 16px -12px rgba(0, 0, 0, 0.12)`,
    },
    space: {
      0: '2px',
      1: '3px',
      2: '4px',
      3: '8px',
      4: '12px',
      5: '16px',
    },
    fontSizes: {
      0: '10px',
      1: '12px',
      2: '13px',
      3: '16px',
      4: '18px',
    },
    fonts: {
      ui: '"Recursive", system-ui, sans-serif',
      body: '"Recursive", system-ui, sans-serif',
      mono: '"Recursive Mono", monospace',
    },
    fontWeights: {},
    lineHeights: {},
    letterSpacings: {},
    sizes: {},
    borderWidths: {
      0: '$1',
    },
    borderStyles: {},
    radii: {
      0: '2px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
    },
    zIndices: {},
    transitions: {},
  },
  media: {
    micro: '(max-width: 370px)',
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
  },
  utils: {
    zStrokeWidth: () => (value: number | number[]) => {
      if (Array.isArray(value)) {
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

export const dark = createTheme({
  colors: {
    brushFill: 'rgba(180, 180, 180, .05)',
    brushStroke: 'rgba(180, 180, 180, .25)',
    hint: 'rgba(216, 226, 249, 1.000)',
    selected: 'rgba(38, 150, 255, 1.000)',
    bounds: 'rgba(38, 150, 255, 1.000)',
    boundsBg: 'rgba(38, 150, 255, 0.05)',
    highlight: 'rgba(38, 150, 255, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.15)',
    overlayContrast: 'rgba(255, 255, 255, 0.15)',
    border: 'rgb(32, 37, 41, 1)',
    focused: 'rgb(32, 37, 41, 1, .15)',
    blurred: 'rgb(32, 37, 41, 1, .05)',
    canvas: '#343d45',
    panel: '#49555f',
    panelBorder: 'rgba(255, 255, 255, 0.12)',
    panelActive: '#fefefe',
    inactive: '#aaaaad',
    hover: '#343d45',
    text: '#f8f9fa',
    muted: '#e0e2e6',
    input: '#f3f3f3',
    inputBorder: '#ddd',
    tooltipBg: '#1d1d1d',
    tooltipText: '#ffffff',
    codeHl: 'rgba(144, 144, 144, .15)',
    lineError: 'rgba(255, 0, 0, .1)',
  },
  shadows: {
    2: '0px 1px 1px rgba(0, 0, 0, 0.24)',
    3: '0px 2px 3px rgba(0, 0, 0, 0.24)',
    4: '0px 4px 5px -1px rgba(0, 0, 0, 0.24)',
    8: '0px 12px 17px rgba(0, 0, 0, 0.24)',
    12: '0px 12px 17px rgba(0, 0, 0, 0.24)',
    24: '0px 24px 38px rgba(0, 0, 0, 0.24)',
    panel: `0px 0px 16px -1px rgba(0, 0, 0, 0.05), 
      0px 0px 16px -8px rgba(0, 0, 0, 0.09), 
      0px 0px 16px -12px rgba(0, 0, 0, 0.2)`,
  },
})

export { styled }
