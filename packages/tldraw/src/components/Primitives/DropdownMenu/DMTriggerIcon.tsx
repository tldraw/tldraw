import * as React from 'react'
import { Trigger } from '@radix-ui/react-dropdown-menu'
import { ToolButton, ToolButtonProps } from '~components/Primitives/ToolButton'

interface DMTriggerIconProps extends ToolButtonProps {
  children: React.ReactNode
  id?: string
}

export function DMTriggerIcon({ id, children, ...rest }: DMTriggerIconProps) {
  return (
    <Trigger asChild id={id}>
      <ToolButton {...rest}>{children}</ToolButton>
    </Trigger>
  )
}
