import { globalCss } from '@stitches/react'

export const globalStyles = globalCss({
  '*': {
    userSelect: 'none !important',
    WebkitUserSelect: 'none !important',
    WebkitTouchCallout: 'none !important',
  },
})
