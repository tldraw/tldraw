import * as React from 'react'
import { LockClosedIcon, LockOpen1Icon } from '@radix-ui/react-icons'
import { Tooltip } from '~components/Tooltip'
import { useTldrawApp } from '~hooks'
import { ToolButton } from '~components/ToolButton'
import type { TDSnapshot } from '~types'

const isToolLockedSelector = (s: TDSnapshot) => s.appState.isToolLocked

export function LockButton(): JSX.Element {
  const app = useTldrawApp()

  const isToolLocked = app.useStore(isToolLockedSelector)

  return (
    <Tooltip label="Lock Tool" kbd="7">
      <ToolButton variant="circle" isActive={isToolLocked} onSelect={app.toggleToolLock}>
        {isToolLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
      </ToolButton>
    </Tooltip>
  )
}
