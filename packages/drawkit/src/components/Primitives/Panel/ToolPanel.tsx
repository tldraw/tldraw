import { styled } from '~styles/stitches.config'

export const ToolPanel = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  gap: '$2',
  overflow: 'hidden',
  variants: {
    side: {
      center: {
        flexGrow: 2,
      },
    },
    panelStyle: {
      row: { flexDirection: 'row' },
      column: { flexDirection: 'column' },
    },
  },
})
