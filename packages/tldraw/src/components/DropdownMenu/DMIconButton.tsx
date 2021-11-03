import * as React from 'react'
import { Item } from '@radix-ui/react-dropdown-menu'
import { IconButton } from '~components/IconButton/IconButton'

interface DMIconButtonProps {
  onSelect: () => void
  disabled?: boolean
  children: React.ReactNode
}

export function DMIconButton({
  onSelect,
  children,
  disabled = false,
}: DMIconButtonProps): JSX.Element {
  return (
    <Item dir="ltr" asChild>
      <IconButton disabled={disabled} onSelect={onSelect}>
        {children}
      </IconButton>
    </Item>
  )
}
