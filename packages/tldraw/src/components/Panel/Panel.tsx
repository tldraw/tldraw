import styled from '~styles/stitches.config'

export const Panel = styled('div', {
  backgroundColor: '$panel',
  display: 'flex',
  flexDirection: 'row',
  padding: '0 $2',
  boxShadow: '$panel',
  variants: {
    side: {
      center: {
        borderTopLeftRadius: '$4',
        borderTopRightRadius: '$4',
        // borderTop: '1px solid $panelBorder',
        // borderLeft: '1px solid $panelBorder',
        // borderRight: '1px solid $panelBorder',
      },
      left: {
        borderBottomRightRadius: '$3',
        padding: '0 0',
        // borderBottom: '1px solid $panelBorder',
        // borderRight: '1px solid $panelBorder',
      },
      right: {
        borderBottomLeftRadius: '$3',
        padding: '0 0',
        // borderBottom: '1px solid $panelBorder',
        // borderLeft: '1px solid $panelBorder',
      },
    },
  },
})
