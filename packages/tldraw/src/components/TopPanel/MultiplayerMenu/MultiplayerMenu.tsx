import * as React from 'react'
import { CheckIcon, ClipboardIcon, CursorArrowIcon, PersonIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTldrawApp } from '~hooks'
import { DMItem, DMContent, DMDivider, DMTriggerIcon } from '~components/Primitives/DropdownMenu'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { MultiplayerIcon } from '~components/Primitives/icons'
import { TDAssetType, TDSnapshot } from '~types'
import { TLDR } from '~state/TLDR'
import { Utils } from '@tldraw/core'
import { FormattedMessage } from 'react-intl'

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

  const handleCreateMultiplayerProject = React.useCallback(async () => {
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

  const handleCopyToMultiplayerProject = React.useCallback(async () => {
    const nextDocument = Utils.deepClone(app.document)

    app.setIsLoading(true)

    try {
      if (app.callbacks.onAssetUpload) {
        for (const id in nextDocument.assets) {
          const asset = nextDocument.assets[id]
          if (asset.src.includes('base64')) {
            const file = dataURLtoFile(
              asset.src,
              asset.fileName ?? asset.type === TDAssetType.Video ? 'image.png' : 'image.mp4'
            )
            const newSrc = await app.callbacks.onAssetUpload(app, file, id)
            if (newSrc) {
              asset.src = newSrc
            } else {
              asset.src = ''
            }
          }
        }
      }

      const result = await fetch(`/api/create`, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: Utils.uniqueId(),
          pageId: app.currentPageId,
          document: nextDocument,
        }),
      }).then((d) => d.json())

      if (result?.url) {
        window.location.href = result.url
      } else {
        TLDR.warn(result?.message)
      }
    } catch (e) {
      TLDR.warn((e as any).message)
    }

    app.setIsLoading(false)
  }, [])

  return (
    <DropdownMenu.Root dir="ltr">
      <DMTriggerIcon id="TD-MultiplayerMenuIcon" isActive={!!room}>
        <PersonIcon />
      </DMTriggerIcon>
      <DMContent variant="menu" align="start" id="TD-MultiplayerMenu">
        <DMItem id="TD-Multiplayer-CopyInviteLink" onClick={handleCopySelect} disabled={!room}>
          <FormattedMessage id="copy.invite.link" />
          <SmallIcon>{copied ? <CheckIcon /> : <ClipboardIcon />}</SmallIcon>
        </DMItem>
        <DMDivider id="TD-Multiplayer-CopyInviteLinkDivider" />
        <DMItem
          id="TD-Multiplayer-CreateMultiplayerProject"
          onClick={handleCreateMultiplayerProject}
        >
          <a href="https://tldraw.com/r">
            <FormattedMessage id="create.multiplayer.project" />
          </a>
        </DMItem>
        <DMItem
          id="TD-Multiplayer-CopyToMultiplayerProject"
          onClick={handleCopyToMultiplayerProject}
        >
          <FormattedMessage id="copy.multiplayer.project" />
        </DMItem>
      </DMContent>
    </DropdownMenu.Root>
  )
})

function dataURLtoFile(dataurl: string, filename: string) {
  const arr = dataurl.split(',')
  const mime = arr[0]?.match(/:(.*?);/)?.[1]
  const bstr = window.atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], filename, { type: mime })
}
