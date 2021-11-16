import * as React from 'react'
import { CheckboxItem } from '@radix-ui/react-dropdown-menu'
import { RowButton, RowButtonProps } from '~components/RowButton'

const preventDefault = (e: Event) => e.preventDefault()

interface DMCheckboxItemProps {
  checked: boolean
  disabled?: boolean
  onCheckedChange: (isChecked: boolean) => void
  children: React.ReactNode
  variant?: RowButtonProps['variant']
  kbd?: string
}

export function DMCheckboxItem({
  checked,
  disabled = false,
  variant,
  onCheckedChange,
  kbd,
  children,
}: DMCheckboxItemProps): JSX.Element {
  return (
    <CheckboxItem
      dir="ltr"
      onSelect={preventDefault}
      onCheckedChange={onCheckedChange}
      checked={checked}
      disabled={disabled}
      asChild
    >
      <RowButton kbd={kbd} variant={variant} hasIndicator>
        {children}
      </RowButton>
    </CheckboxItem>
  )
}
