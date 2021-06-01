import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Square } from 'react-feather'
import styled from 'styles'

interface Props {
  colors: Record<string, string>
  onChange: (color: string) => void
  children: React.ReactNode
}

export default function ColorPicker({ colors, onChange, children }: Props) {
  return (
    <DropdownMenu.Root>
      {children}
      <Colors sideOffset={4}>
        {Object.entries(colors).map(([name, color]) => (
          <ColorButton key={name} title={name} onSelect={() => onChange(name)}>
            <ColorIcon color={color} />
          </ColorButton>
        ))}
      </Colors>
    </DropdownMenu.Root>
  )
}

export function ColorIcon({ color }: { color: string }) {
  return (
    <Square fill={color} strokeDasharray={color === 'none' ? '2, 3' : 'none'} />
  )
}

export const Colors = styled(DropdownMenu.Content, {
  display: 'grid',
  padding: 4,
  gridTemplateColumns: 'repeat(6, 1fr)',
  border: '1px solid $border',
  backgroundColor: '$panel',
  borderRadius: 4,
  boxShadow: '0px 5px 15px -5px hsla(206,22%,7%,.15)',
})

export const ColorButton = styled(DropdownMenu.Item, {
  position: 'relative',
  cursor: 'pointer',
  height: 32,
  width: 32,
  border: 'none',
  padding: 'none',
  background: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  '&::before': {
    content: "''",
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    pointerEvents: 'none',
    zIndex: 0,
  },

  '&:hover::before': {
    backgroundColor: '$hover',
    borderRadius: 4,
  },

  '& svg': {
    position: 'relative',
    stroke: 'rgba(0,0,0,.2)',
    strokeWidth: 1,
    zIndex: 1,
  },
})

export const CurrentColor = styled(DropdownMenu.Trigger, {
  position: 'relative',
  display: 'flex',
  width: '100%',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  outline: 'none',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 6px 4px 12px',

  '&::before': {
    content: "''",
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: -1,
  },

  '&:hover::before': {
    backgroundColor: '$hover',
    borderRadius: 4,
  },

  '& label': {
    fontFamily: '$ui',
    fontSize: '$2',
    fontWeight: '$1',
    margin: 0,
    padding: 0,
  },

  '& svg': {
    position: 'relative',
    stroke: 'rgba(0,0,0,.2)',
    strokeWidth: 1,
    zIndex: 1,
  },

  variants: {
    size: {
      icon: {
        padding: '4px ',
        width: 'auto',
      },
    },
  },
})
