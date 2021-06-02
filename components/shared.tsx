import styled from 'styles'

export const IconButton = styled('button', {
  height: '32px',
  width: '32px',
  backgroundColor: '$panel',
  borderRadius: '4px',
  padding: '0',
  margin: '0',
  display: 'grid',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  border: 'none',
  pointerEvents: 'all',
  cursor: 'pointer',

  '& > *': {
    gridRow: 1,
    gridColumn: 1,
  },

  '&:hover:not(:disabled)': {
    backgroundColor: '$hover',
  },

  '&:disabled': {
    opacity: '0.5',
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
        height: 44,
        width: 44,
        '& svg': {
          height: '20px',
          width: '20px',
        },
      },
      large: {
        height: 44,
        width: 44,
        '& svg': {
          height: '24px',
          width: '24px',
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
