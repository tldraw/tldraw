import { styled } from '~styles/stitches.config'

export const Panel = styled('div', {
  backgroundColor: '$panel',
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',
  boxShadow: '$panel',
  padding: '$2',
  border: '1px solid $panelContrast',
  gap: 0,
  overflow: 'hidden',
  variants: {
    side: {
      center: {
        borderRadius: 9,
      },
      left: {
        padding: 0,
        borderTop: 0,
        borderLeft: 0,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 9,
        borderBottomLeftRadius: 0,
      },
      right: {
        padding: 0,
        borderTop: 0,
        borderRight: 0,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 9,
        borderBottomRightRadius: 0,
      },
    },
  },
  '& hr': {
    height: 10,
    width: '100%',
    backgroundColor: 'red',
    border: 'none',
  },
})
