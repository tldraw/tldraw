import { toolButton, toolButtonInner } from '~components'
import css from '~styles'

export const buttonsContainer = css({
  backgroundColor: '$panel',
  display: 'flex',
  flexDirection: 'row',
  padding: '0 $2',
  variants: {
    side: {
      center: {
        borderTopLeftRadius: '$4',
        borderTopRightRadius: '$4',
        borderTop: '1px solid $panelBorder',
        borderLeft: '1px solid $panelBorder',
        borderRight: '1px solid $panelBorder',
      },
      left: {
        borderBottomRightRadius: '$4',
        borderBottom: '1px solid $panelBorder',
        borderRight: '1px solid $panelBorder',
      },
      right: {
        borderBottomLeftRadius: '$4',
        borderBottom: '1px solid $panelBorder',
        borderLeft: '1px solid $panelBorder',
      },
    },
  },
})

export const secondaryButtonsContainer = css(buttonsContainer, {
  display: 'none',
  variants: {
    bp: {
      mobile: {
        display: 'none',
      },
      small: {
        display: 'flex',
      },
    },
  },
})

export const floatToolButton = css(toolButton, {})

export const floatToolButtonInner = css(toolButtonInner, {
  borderRadius: '100%',
  border: '1px solid $panelBorder',
  variants: {
    isActive: {
      false: {
        '& > svg': {
          width: 14,
          height: 14,
        },
      },
      true: {
        backgroundColor: '$selected',
        color: '$panel',
        '& > svg': {
          width: 14,
          height: 14,
        },
      },
    },
  },
})
