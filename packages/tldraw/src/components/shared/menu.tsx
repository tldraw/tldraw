import { breakpoints } from './breakpoints'
import styled from '~styles'
import { RowButton } from './row-button'

/* -------------------------------------------------- */
/*                        Menu                        */
/* -------------------------------------------------- */

export const MenuContent = styled('div', {
  position: 'relative',
  overflow: 'hidden',
  userSelect: 'none',
  zIndex: 180,
  minWidth: 180,
  pointerEvents: 'all',
  backgroundColor: '$panel',
  border: '1px solid $panel',
  padding: '$0',
  boxShadow: '$4',
  borderRadius: '4px',
  font: '$ui',
})

export const Divider = styled('div', {
  backgroundColor: '$hover',
  height: 1,
  marginTop: '$2',
  marginRight: '-$2',
  marginBottom: '$2',
  marginLeft: '-$2',
})

export function MenuButton({
  warn,
  onSelect,
  children,
  disabled = false,
}: {
  warn?: boolean
  onSelect?: () => void
  disabled?: boolean
  children: React.ReactNode
}): JSX.Element {
  return (
    <RowButton bp={breakpoints} disabled={disabled} warn={warn} onSelect={onSelect}>
      {children}
    </RowButton>
  )
}

export const MenuTextInput = styled('input', {
  backgroundColor: '$panel',
  border: 'none',
  padding: '$4 $3',
  width: '100%',
  outline: 'none',
  background: '$input',
  borderRadius: '4px',
  font: '$ui',
  fontSize: '$1',
})
