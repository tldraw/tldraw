import css from '~styles'

/* -------------------------------------------------- */
/*                    Icon Wrapper                    */
/* -------------------------------------------------- */

export const iconWrapper = css({
  height: '100%',
  borderRadius: '4px',
  marginRight: '1px',
  display: 'grid',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  border: 'none',
  pointerEvents: 'all',
  cursor: 'pointer',
  color: '$text',

  '& svg': {
    height: 22,
    width: 22,
    strokeWidth: 1,
  },

  '& > *': {
    gridRow: 1,
    gridColumn: 1,
  },

  variants: {
    size: {
      small: {
        '& svg': {
          height: '16px',
          width: '16px',
        },
      },
      medium: {
        '& svg': {
          height: '22px',
          width: '22px',
        },
      },
    },
  },
})
