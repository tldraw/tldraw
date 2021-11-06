import * as React from 'react'
import { Trigger } from '@radix-ui/react-dropdown-menu'
import { ToolButton } from '~components/ToolButton'

interface DMTriggerIconProps {
  children: React.ReactNode
}

export function DMTriggerIcon({ children }: DMTriggerIconProps) {
  return (
    <Trigger asChild>
      <ToolButton>{children}</ToolButton>
    </Trigger>
  )
}
