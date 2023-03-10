import { styled } from '~styles'

export const MenuContent = styled('div', {
  position: 'relative',
  overflow: 'hidden',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 99997,
  minWidth: 180,
  pointerEvents: 'all',
  backgroundColor: '$panel',
  border: '1px solid $panelContrast',
  boxShadow: '$panel',
  padding: '$2 $2',
  borderRadius: '$3',
  font: '$ui',
  maxHeight: '100vh',
  overflowY: 'auto',
  overflowX: 'hidden',
  '&::webkit-scrollbar': {
    display: 'none',
  },
  '-ms-overflow-style': 'none' /* for Internet Explorer, Edge */,
  scrollbarWidth: 'none',
  variants: {
    size: {
      small: {
        minWidth: 72,
      },
    },
    overflow: {
      true: {
        maxHeight: '60vh',
      },
    },
  },
})
