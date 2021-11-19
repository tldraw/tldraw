import * as React from 'react'
import { CheckIcon, ClipboardIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTldrawApp } from '~hooks'
import { DMItem, DMContent, DMDivider, DMTriggerIcon } from '~components/Primitives/DropdownMenu'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { MultiplayerIcon } from '~components/Primitives/icons'
import type { TDSnapshot } from '~types'
import { TLDR } from '~state/TLDR'

const roomSelector = (state: TDSnapshot) => state.room

export const MultiplayerMenu = React.memo(function MultiplayerMenu() {
  const app = useTldrawApp()

  const room = app.useStore(roomSelector)

  const [copied, setCopied] = React.useState(false)

  const handleCopySelect = React.useCallback(() => {
    setCopied(true)
    TLDR.copyStringToClipboard(window.location.href)
    setTimeout(() => setCopied(false), 1200)
  }, [])

  const handleCreateMultiplayerRoom = React.useCallback(async () => {
    if (app.isDirty) {
      if (app.fileSystemHandle) {
        if (window.confirm('Do you want to save changes to your current project?')) {
          await app.saveProject()
        }
      } else {
        if (window.confirm('Do you want to save your current project?')) {
          await app.saveProject()
        }
      }
    } else if (!app.fileSystemHandle) {
      if (window.confirm('Do you want to save your current project?')) {
        await app.saveProject()
      }
    }
  }, [])

  const handleCopyToMultiplayerRoom = React.useCallback(async () => {
    const myHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    })

    const res = await fetch('http://tldraw.com/api/create-multiplayer-room', {
      headers: myHeaders,
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      body: JSON.stringify(app.document),
    }).then((res) => res.json())

    window.location.href = `http://tldraw.com/r/${res.roomId}`
  }, [])

  return (
    <DropdownMenu.Root dir="ltr">
      <DMTriggerIcon>
        <MultiplayerIcon />
      </DMTriggerIcon>
      <DMContent variant="menu" align="start">
        <DMItem onClick={handleCreateMultiplayerRoom}>
          <a href="https://tldraw.com/r">Create a Multiplayer Room</a>
        </DMItem>
        <DMItem onClick={handleCopyToMultiplayerRoom}>Copy to Multiplayer Room</DMItem>
        {room && (
          <>
            <DMDivider />
            <DMItem onClick={handleCopySelect}>
              Copy Invite Link<SmallIcon>{copied ? <CheckIcon /> : <ClipboardIcon />}</SmallIcon>
            </DMItem>
          </>
        )}
      </DMContent>
    </DropdownMenu.Root>
  )
})
