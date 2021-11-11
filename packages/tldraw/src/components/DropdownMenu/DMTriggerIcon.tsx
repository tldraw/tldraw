import * as React from 'react'
import { Trigger } from '@radix-ui/react-dropdown-menu'
import { ToolButton, ToolButtonProps } from '~components/ToolButton'

interface DMTriggerIconProps extends ToolButtonProps {
  children: React.ReactNode
}

export function DMTriggerIcon({ children, ...rest }: DMTriggerIconProps) {
  return (
    <Trigger asChild>
      <ToolButton {...rest}>{children}</ToolButton>
    </Trigger>
  )
}
