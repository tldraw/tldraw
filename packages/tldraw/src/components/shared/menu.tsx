import { breakpoints } from './breakpoints'
import css from '~styles'
import { rowButton } from './row-button'

/* -------------------------------------------------- */
/*                        Menu                        */
/* -------------------------------------------------- */

export const menuContent = css({
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

export const divider = css({
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
    <button
      className={rowButton({ bp: breakpoints, warn })}
      disabled={disabled}
      onSelect={onSelect}
    >
      {children}
    </button>
  )
}

export const menuTextInput = css({
  backgroundColor: '$panel',
  border: 'none',
  padding: '$4 $3',
  width: '100%',
  outline: 'none',
  background: '$input',
  borderRadius: '4px',
  fontFamily: '$ui',
  fontSize: '$1',
  userSelect: 'all',
})
