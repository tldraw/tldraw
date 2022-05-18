import * as React from 'react'
import { CheckIcon, ClipboardIcon, CursorArrowIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTldrawApp } from '~hooks'
import { DMItem, DMContent, DMDivider, DMTriggerIcon } from '~components/Primitives/DropdownMenu'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { MultiplayerIcon } from '~components/Primitives/icons'
import type { TDSnapshot } from '~types'
import { TLDR } from '~state/TLDR'
import { compress } from 'lz-string'

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

    const res = await fetch(`/api/create`, {
      headers: myHeaders,
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(app.document),
    }).then((res) => res.json())

    if (res?.roomId) {
      window.location.href = `/r/${res.roomId}`
    }
  }, [])

  return (
    <DropdownMenu.Root dir="ltr">
      <DMTriggerIcon id="TD-MultiplayerMenuIcon">
        {room ? <MultiplayerIcon /> : <CursorArrowIcon />}
      </DMTriggerIcon>
      <DMContent variant="menu" align="start" id="TD-MultiplayerMenu">
        <DMItem id="TD-Multiplayer-CopyInviteLink" onClick={handleCopySelect} disabled={!room}>
          Copy Invite Link<SmallIcon>{copied ? <CheckIcon /> : <ClipboardIcon />}</SmallIcon>
        </DMItem>
        <DMDivider id="TD-Multiplayer-CopyInviteLinkDivider" />
        <DMItem id="TD-Multiplayer-CreateMultiplayerRoom" onClick={handleCreateMultiplayerRoom}>
          <a href="https://tldraw.com/r">Create a Multiplayer Project</a>
        </DMItem>
        <DMItem id="TD-Multiplayer-CopyToMultiplayerRoom" onClick={handleCopyToMultiplayerRoom}>
          Copy to Multiplayer Room
        </DMItem>
      </DMContent>
    </DropdownMenu.Root>
  )
})
