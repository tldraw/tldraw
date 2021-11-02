import css from '~styles'

export const toolButtonInner = css({
  position: 'relative',
  height: '100%',
  width: '100%',
  color: '$text',
  backgroundColor: '$panel',
  borderRadius: '$2',
  margin: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: '$ui',
  variants: {
    variant: {
      icon: {},
      text: {
        fontSize: '$1',
        padding: '0 $3',
      },
    },
    isActive: {
      false: {
        '& > svg': {
          width: 20,
          height: 20,
        },
      },
      true: {
        backgroundColor: '$selected',
        color: '$panelActive',
        '& > svg': {
          width: 16,
          height: 16,
        },
      },
    },
  },
})
