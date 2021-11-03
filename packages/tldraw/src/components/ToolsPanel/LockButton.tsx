import * as React from 'react'
import { LockClosedIcon, LockOpen1Icon } from '@radix-ui/react-icons'
import { Tooltip } from '~components/Tooltip'
import { useTLDrawContext } from '~hooks'
import { ToolButton } from '~components/ToolButton'
import type { Data } from '~types'

const isToolLockedSelector = (s: Data) => s.appState.isToolLocked

export function LockButton(): JSX.Element {
  const { tlstate, useSelector } = useTLDrawContext()

  const isToolLocked = useSelector(isToolLockedSelector)

  return (
    <Tooltip label="Lock Tool" kbd="7">
      <ToolButton variant="circle" isActive={isToolLocked} onSelect={tlstate.toggleToolLock}>
        {isToolLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
      </ToolButton>
    </Tooltip>
  )
}
