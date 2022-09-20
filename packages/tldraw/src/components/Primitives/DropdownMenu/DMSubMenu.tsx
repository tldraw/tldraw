import { Arrow, Sub, SubContent, SubTrigger } from '@radix-ui/react-dropdown-menu'
import * as React from 'react'
import { MenuContent } from '~components/Primitives/MenuContent'
import { RowButton } from '~components/Primitives/RowButton'

export interface DMSubMenuProps {
  label: string
  size?: 'small'
  disabled?: boolean
  children: React.ReactNode
  overflow?: boolean
  id?: string
}

export function DMSubMenu({
  children,
  size,
  overflow = false,
  disabled = false,
  label,
  id,
}: DMSubMenuProps) {
  return (
    <Sub key={id}>
      <SubTrigger dir="ltr" asChild>
        <RowButton disabled={disabled} hasArrow>
          {label}
        </RowButton>
      </SubTrigger>
      <SubContent asChild sideOffset={4} alignOffset={-4}>
        <MenuContent size={size} overflow={overflow}>
          {children}
          <Arrow offset={13} />
        </MenuContent>
      </SubContent>
    </Sub>
  )
}
