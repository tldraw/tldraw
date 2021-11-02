import { toolButtonInner } from '~components'
import css from '~styles'

export const toolButton = css({
  position: 'relative',
  color: '$text',
  height: '48px',
  width: '40px',
  fontSize: '$0',
  background: 'none',
  margin: '0',
  padding: '$3 $2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  border: 'none',
  cursor: 'pointer',
  pointerEvents: 'all',

  variants: {
    variant: {
      icon: {},
      text: {
        width: 'auto',
      },
    },
    isActive: {
      true: {},
      false: {
        [`&:hover:not(:disabled) .${toolButtonInner()}`]: {
          backgroundColor: '$hover',
        },
      },
    },
  },
})
