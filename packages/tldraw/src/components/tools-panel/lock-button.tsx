import { LockClosedIcon, LockOpen1Icon } from '@radix-ui/react-icons'
import * as React from 'react'
import { Tooltip } from '~components'
import { floatToolButton, floatToolButtonInner } from '~components/tools-panel/styled'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'

const isToolLockedSelector = (s: Data) => s.appState.isToolLocked

export function LockButton(): JSX.Element {
  const { tlstate, useSelector } = useTLDrawContext()

  const isToolLocked = useSelector(isToolLockedSelector)

  return (
    <Tooltip label="Lock Tool" kbd="7">
      <button
        className={floatToolButton({
          bp: {
            '@initial': 'mobile',
            '@sm': 'small',
            '@md': 'medium',
            '@lg': 'large',
          },
          name: 'Lock Tool',
          isActive: isToolLocked,
        })}
        onPointerDown={tlstate.toggleToolLock}
      >
        <div
          className={floatToolButtonInner({
            isActive: isToolLocked,
          })}
        >
          {isToolLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
        </div>
      </button>
    </Tooltip>
  )
}
