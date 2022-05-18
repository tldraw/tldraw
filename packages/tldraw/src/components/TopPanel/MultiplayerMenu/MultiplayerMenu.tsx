import * as React from 'react'
import { CheckIcon, ClipboardIcon, CursorArrowIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTldrawApp } from '~hooks'
import { DMItem, DMContent, DMDivider, DMTriggerIcon } from '~components/Primitives/DropdownMenu'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { MultiplayerIcon } from '~components/Primitives/icons'
import type { TDSnapshot } from '~types'
import { TLDR } from '~state/TLDR'
import { Utils } from '@tldraw/core'

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
    const nextDocument = { ...app.document }

    // TODO: Upload images to server
    if (app.callbacks.onAssetUpload) {
      for (const id in nextDocument.assets) {
        const asset = nextDocument.assets[id]
        const newSrc = await app.callbacks.onAssetUpload(app, id, asset)
        if (newSrc) {
          asset.src = newSrc
        } else {
          asset.src = ''
        }
      }
    }

    const body = JSON.stringify({
      roomId: Utils.uniqueId(),
      pageId: app.currentPageId,
      document: nextDocument,
    })

    const myHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    })

    app.setIsLoading(true)

    try {
      const res = await fetch(`/api/create`, {
        headers: myHeaders,
        method: 'POST',
        mode: 'no-cors',
        body,
      }).then((res) => res.json())

      if (res?.roomId) {
        window.location.href = `/r/${res.roomId}`
      } else {
        TLDR.warn(res.message)
      }
    } catch (e: any) {
      TLDR.warn(e.message)
    }

    app.setIsLoading(false)
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
