import * as React from 'react'
import { ContextMenuItem } from '@radix-ui/react-context-menu'
import { RowButton, RowButtonProps } from '~components/RowButton'

export const CMRowButton = ({ ...rest }: RowButtonProps) => {
  return (
    <ContextMenuItem asChild>
      <RowButton {...rest} />
    </ContextMenuItem>
  )
}
