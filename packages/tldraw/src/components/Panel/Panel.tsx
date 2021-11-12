import { styled } from '~styles/stitches.config'

export const Panel = styled('div', {
  backgroundColor: '$panel',
  display: 'flex',
  flexDirection: 'row',
  boxShadow: '$panel',
  padding: '$2',
  variants: {
    side: {
      center: {
        borderRadius: '$4',
      },
      left: {
        borderBottomRightRadius: '$3',
      },
      right: {
        borderBottomLeftRadius: '$3',
      },
    },
  },
})
