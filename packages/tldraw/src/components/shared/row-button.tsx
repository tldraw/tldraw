import css from '~styles'

/* -------------------------------------------------- */
/*                     Row Button                     */
/* -------------------------------------------------- */

export const rowButton = css({
  position: 'relative',
  display: 'flex',
  width: '100%',
  background: 'none',
  height: '32px',
  border: 'none',
  cursor: 'pointer',
  color: '$text',
  outline: 'none',
  alignItems: 'center',
  fontFamily: '$ui',
  fontWeight: 400,
  fontSize: '$1',
  justifyContent: 'space-between',
  padding: '4px 8px 4px 12px',
  borderRadius: 4,
  userSelect: 'none',

  '& label': {
    fontWeight: '$1',
    margin: 0,
    padding: 0,
  },

  '& svg': {
    position: 'relative',
    stroke: '$overlay',
    strokeWidth: 1,
    zIndex: 1,
  },

  '&[data-disabled]': {
    opacity: 0.3,
  },

  '&:disabled': {
    opacity: 0.3,
  },

  variants: {
    bp: {
      mobile: {},
      small: {
        '& *[data-shy="true"]': {
          opacity: 0,
        },
        '&:hover:not(:disabled)': {
          backgroundColor: '$hover',
          '& *[data-shy="true"]': {
            opacity: 1,
          },
        },
      },
    },
    size: {
      icon: {
        padding: '4px ',
        width: 'auto',
      },
    },
    variant: {
      noIcon: {
        padding: '4px 12px',
      },
      pageButton: {
        display: 'grid',
        gridTemplateColumns: '24px auto',
        width: '100%',
        paddingLeft: '$1',
        gap: '$3',
        justifyContent: 'flex-start',
        [`& > *[data-state="checked"]`]: {
          gridRow: 1,
          gridColumn: 1,
        },
        '& > span': {
          gridRow: 1,
          gridColumn: 2,
          width: '100%',
        },
      },
    },
    warn: {
      true: {
        color: '$warn',
      },
    },
    isActive: {
      true: {
        backgroundColor: '$hover',
      },
    },
  },
})
