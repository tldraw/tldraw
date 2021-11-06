import * as React from 'react'
import { ContextMenuTriggerItem } from '@radix-ui/react-context-menu'
import { RowButton, RowButtonProps } from '~components/RowButton'

interface CMTriggerButtonProps extends RowButtonProps {
  isSubmenu?: boolean
}

export const CMTriggerButton = ({ isSubmenu, ...rest }: CMTriggerButtonProps) => {
  return (
    <ContextMenuTriggerItem asChild>
      <RowButton hasArrow={isSubmenu} {...rest} />
    </ContextMenuTriggerItem>
  )
}
