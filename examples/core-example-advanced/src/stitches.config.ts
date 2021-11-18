import { createStitches, defaultThemeMap } from '@stitches/react'

export const { styled } = createStitches({
  themeMap: {
    ...defaultThemeMap,
  },
  theme: {
    colors: {
      text: 'black',
      background: 'white',
      hover: 'rgba(144, 144, 144, .1)',
      border: 'rgba(144, 144, 144, .32)',
      active: 'dodgerblue',
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
      ui: '"Inter", system-ui, sans-serif',
      body: '"Inter", system-ui, sans-serif',
      mono: '"Roboto Mono", monospace',
    },
    fontWeights: {
      0: '400',
      1: '500',
      2: '700',
    },
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
    zStrokeWidth: () => (value: number) => ({
      strokeWidth: `calc(${value}px / var(--camera-zoom))`,
    }),
  },
})

export default styled
