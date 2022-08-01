import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { CheckIcon, ClipboardIcon } from '@radix-ui/react-icons'
import { Utils } from '@tldraw/core'
import * as React from 'react'
import { FormattedMessage } from 'react-intl'
import { Divider } from '~components/Primitives/Divider'
import { DMContent, DMItem, DMTriggerIcon } from '~components/Primitives/DropdownMenu'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { MultiplayerIcon2 } from '~components/Primitives/icons/MultiplayerIcon2'
import { useTldrawApp } from '~hooks'
import { TLDR } from '~state/TLDR'
import { TDAssetType, TDSnapshot } from '~types'

const roomSelector = (state: TDSnapshot) => state.room

export const MultiplayerMenu = function MultiplayerMenu() {
  const app = useTldrawApp()

  const room = app.useStore(roomSelector)

  const [copied, setCopied] = React.useState(false)

  const rTimeout = React.useRef<any>(0)

  const handleCopySelect = React.useCallback(() => {
    setCopied(true)
    TLDR.copyStringToClipboard(window.location.href)
    clearTimeout(rTimeout.current)
    rTimeout.current = setTimeout(() => setCopied(false), 1200)
  }, [])

  const handleCopyReadOnlySelect = React.useCallback(() => {
    setCopied(true)
    const segs = window.location.href.split('/')
    segs[segs.length - 2] = 'v'
    segs[segs.length - 1] = Utils.lns(segs[segs.length - 1])
    TLDR.copyStringToClipboard(segs.join('/'))
    clearTimeout(rTimeout.current)
    rTimeout.current = setTimeout(() => setCopied(false), 1200)
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
        <MultiplayerIcon2 />
      </DMTriggerIcon>
      <DMContent variant="menu" id="TD-MultiplayerMenu" side="bottom" align="start" sideOffset={4}>
        <DMItem id="TD-Multiplayer-CopyInviteLink" onClick={handleCopySelect} disabled={!room}>
          <FormattedMessage id="copy.invite.link" />
          <SmallIcon>{copied ? <CheckIcon /> : <ClipboardIcon />}</SmallIcon>
        </DMItem>
        <DMItem
          id="TD-Multiplayer-CopyReadOnlyLink"
          onClick={handleCopyReadOnlySelect}
          disabled={!room}
        >
          <FormattedMessage id="copy.readonly.link" />
          <SmallIcon>{copied ? <CheckIcon /> : <ClipboardIcon />}</SmallIcon>
        </DMItem>
        <Divider />
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
}

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
