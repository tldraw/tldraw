import * as React from 'react'
import { ContextMenuItem } from '@radix-ui/react-context-menu'
import { ToolButton, ToolButtonProps } from '~components/ToolButton'

export function CMIconButton(props: ToolButtonProps): JSX.Element {
  return (
    <ContextMenuItem dir="ltr" asChild>
      <ToolButton {...props} />
    </ContextMenuItem>
  )
}
