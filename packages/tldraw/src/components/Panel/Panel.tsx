import { styled } from '~styles/stitches.config'

export const Panel = styled('div', {
  backgroundColor: '$panel',
  display: 'flex',
  flexDirection: 'row',
  boxShadow: '$panel',
  padding: '$2',
  border: '1px solid $panelContrast',
  gap: 0,
  variants: {
    side: {
      center: {
        borderRadius: '$4',
      },
      left: {
        padding: 0,
        borderTop: 0,
        borderLeft: 0,
        borderTopRightRadius: '$1',
        borderBottomRightRadius: '$3',
        borderBottomLeftRadius: '$1',
      },
      right: {
        padding: 0,
        borderTop: 0,
        borderRight: 0,
        borderTopLeftRadius: '$1',
        borderBottomLeftRadius: '$3',
        borderBottomRightRadius: '$1',
      },
    },
  },
})
