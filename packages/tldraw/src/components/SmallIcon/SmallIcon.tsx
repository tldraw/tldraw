import { styled } from '~styles'

export const SmallIcon = styled('div', {
  height: '100%',
  borderRadius: '4px',
  marginRight: '1px',
  width: 'fit-content',
  display: 'grid',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  border: 'none',
  pointerEvents: 'all',
  cursor: 'pointer',
  color: 'currentColor',

  '& svg': {
    height: 16,
    width: 16,
    strokeWidth: 1,
  },

  '& > *': {
    gridRow: 1,
    gridColumn: 1,
  },
})
