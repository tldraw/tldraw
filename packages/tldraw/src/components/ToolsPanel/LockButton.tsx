import { LockClosedIcon, LockOpen1Icon } from '@radix-ui/react-icons'
import * as React from 'react'
import { ToolButton } from '~components/Primitives/ToolButton'
import { Tooltip } from '~components/Primitives/Tooltip'
import { useTldrawApp } from '~hooks'
import type { TDSnapshot } from '~types'

const isToolLockedSelector = (s: TDSnapshot) => s.appState.isToolLocked

export function LockButton() {
  const app = useTldrawApp()

  const isToolLocked = app.useStore(isToolLockedSelector)

  return (
    <Tooltip label="Lock Tool" kbd="7" id="TD-Lock">
      <ToolButton variant="circle" isActive={isToolLocked} onSelect={app.toggleToolLock}>
        {isToolLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
      </ToolButton>
    </Tooltip>
  )
}
