import { styled } from '~styles'

export const Divider = styled('hr', {
  height: 0,
  paddingTop: 1,
  width: 'calc(100%+8px)',
  backgroundColor: '$hover',
  border: 'none',
  margin: '$2 -4px',
})
