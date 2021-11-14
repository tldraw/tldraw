import { styled } from '~styles/stitches.config'

export const Panel = styled('div', {
  backgroundColor: '$panel',
  display: 'flex',
  flexDirection: 'row',
  boxShadow: '$panel',
  padding: '$2',
  gap: 0,
  variants: {
    side: {
      center: {
        borderRadius: '$4',
      },
      left: {
        padding: 0,
        borderBottomRightRadius: '$3',
      },
      right: {
        padding: 0,
        borderBottomLeftRadius: '$3',
      },
    },
  },
})
