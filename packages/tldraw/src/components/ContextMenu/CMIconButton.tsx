import * as React from 'react'
import { ContextMenuItem } from '@radix-ui/react-context-menu'
import { ToolButton, ToolButtonProps } from '~components/Primitives/ToolButton'

export function CMIconButton({ onSelect, ...rest }: ToolButtonProps): JSX.Element {
  return (
    <ContextMenuItem dir="ltr" onSelect={onSelect} asChild>
      <ToolButton {...rest} />
    </ContextMenuItem>
  )
}
