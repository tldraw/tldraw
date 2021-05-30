import styled from 'styles'

export const IconButton = styled('button', {
  height: '32px',
  width: '32px',
  backgroundColor: '$panel',
  borderRadius: '4px',
  padding: '0',
  margin: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  border: 'none',
  pointerEvents: 'all',
  cursor: 'pointer',

  '&:hover:not(:disabled)': {
    backgroundColor: '$hover',
  },

  '&:disabled': {
    opacity: '0.5',
  },

  '& > svg': {
    height: '16px',
    width: '16px',
  },

  variants: {
    size: {
      small: {},
      medium: {
        height: 44,
        width: 44,
        '& svg': {
          height: 16,
          width: 16,
          strokeWidth: 0,
        },
      },
      large: {
        height: 44,
        width: 44,
        '& svg': {
          height: 24,
          width: 24,
          strokeWidth: 0,
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
