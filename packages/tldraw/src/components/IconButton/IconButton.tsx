import { styled } from '~styles'

export const IconButton = styled('button', {
  position: 'relative',
  height: '32px',
  width: '32px',
  backgroundColor: '$panel',
  borderRadius: '4px',
  padding: '0',
  margin: '0',
  outline: 'none',
  border: 'none',
  pointerEvents: 'all',
  fontSize: '$0',
  color: '$text',
  cursor: 'pointer',
  display: 'grid',
  alignItems: 'center',
  justifyContent: 'center',

  '& > *': {
    gridRow: 1,
    gridColumn: 1,
  },

  '&:disabled': {
    opacity: '0.5',
  },

  '& > span': {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
  },

  variants: {
    bp: {
      mobile: {
        backgroundColor: 'transparent',
      },
      small: {
        '&:hover:not(:disabled)': {
          backgroundColor: '$hover',
        },
      },
    },
    size: {
      small: {
        height: 32,
        width: 32,
        '& svg:nth-of-type(1)': {
          height: '16px',
          width: '16px',
        },
      },
      medium: {
        height: 44,
        width: 44,
        '& svg:nth-of-type(1)': {
          height: '18px',
          width: '18px',
        },
      },
      large: {
        height: 44,
        width: 44,
        '& svg:nth-of-type(1)': {
          height: '20px',
          width: '20px',
        },
      },
    },
    isActive: {
      true: {
        color: '$selected',
      },
    },
  },
})
