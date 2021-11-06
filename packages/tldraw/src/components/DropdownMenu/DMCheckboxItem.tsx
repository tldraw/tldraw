import * as React from 'react'
import { CheckboxItem } from '@radix-ui/react-dropdown-menu'
import { RowButton } from '~components/RowButton'

interface DMCheckboxItemProps {
  checked: boolean
  disabled?: boolean
  onCheckedChange: (isChecked: boolean) => void
  children: React.ReactNode
  kbd?: string
}

export function DMCheckboxItem({
  checked,
  disabled = false,
  onCheckedChange,
  kbd,
  children,
}: DMCheckboxItemProps): JSX.Element {
  return (
    <CheckboxItem
      dir="ltr"
      onCheckedChange={onCheckedChange}
      checked={checked}
      disabled={disabled}
      asChild
    >
      <RowButton kbd={kbd} hasIndicator>
        {children}
      </RowButton>
    </CheckboxItem>
  )
}
