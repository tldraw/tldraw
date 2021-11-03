import styled from '~styles'

export const MenuContent = styled('div', {
  position: 'relative',
  overflow: 'hidden',
  userSelect: 'none',
  zIndex: 180,
  minWidth: 180,
  pointerEvents: 'all',
  backgroundColor: '$panel',
  border: '1px solid $panelBorder',
  padding: '$0',
  borderRadius: '$2',
  font: '$ui',
})
