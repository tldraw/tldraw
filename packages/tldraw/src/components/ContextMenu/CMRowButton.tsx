import * as React from 'react'
import { ContextMenuItem } from '@radix-ui/react-context-menu'
import { RowButton, RowButtonProps } from '~components/RowButton'

export const CMRowButton = ({ onSelect, ...rest }: RowButtonProps) => {
  return (
    <ContextMenuItem asChild onSelect={onSelect}>
      <RowButton {...rest} />
    </ContextMenuItem>
  )
}
