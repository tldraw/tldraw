import * as React from 'react'
import {
  CheckIcon,
  ClipboardIcon,
  CopyIcon,
  ExitIcon,
  GitHubLogoIcon,
  HamburgerMenuIcon,
  TwitterLogoIcon,
} from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTLDrawContext } from '~hooks'
import { PreferencesMenu } from './PreferencesMenu'
import { DMItem, DMContent, DMDivider, DMSubMenu, DMTriggerIcon } from '~components/DropdownMenu'
import { SmallIcon } from '~components/SmallIcon'
import { useFileSystemHandlers } from '~hooks'
import { HeartIcon } from '~components/icons/HeartIcon'
import { MultiplayerIcon } from '~components/icons'
import type { TLDrawSnapshot } from '~types'
import { Utils } from '@tldraw/core'
import { TLDR } from '~state/TLDR'

interface MultiplayerMenuProps {
  id?: string
  // noop
}

const roomSelector = (state: TLDrawSnapshot) => state.room

export const MultiplayerMenu = React.memo(function MultiplayerMenu({ id }: MultiplayerMenuProps) {
  const { state, useSelector } = useTLDrawContext()

  const room = useSelector(roomSelector)

  const [copied, setCopied] = React.useState(false)

  const handleCopySelect = React.useCallback(() => {
    setCopied(true)
    TLDR.copyStringToClipboard(window.location.href)
    setTimeout(() => setCopied(false), 1200)
  }, [])

  console.log('room id', room)

  const handleCreateMultiplayerRoom = React.useCallback(async () => {
    if (state.isDirty) {
      if (state.fileSystemHandle) {
        if (window.confirm('Do you want to save changes to your current project?')) {
          await state.saveProject()
        }
      } else {
        if (window.confirm('Do you want to save your current project?')) {
          await state.saveProject()
        }
      }
    } else if (!state.fileSystemHandle) {
      if (window.confirm('Do you want to save your current project?')) {
        await state.saveProject()
      }
    }
  }, [])

  const handleCopyToMultiplayerRoom = React.useCallback(async () => {
    const myHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    })

    const res = await fetch('http://localhost:3000/api/create-multiplayer-room', {
      headers: myHeaders,
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      body: JSON.stringify(state.document),
    }).then((res) => res.json())

    window.location.href = `http://localhost:3000/r/${res.roomId}`
  }, [])

  return (
    <DropdownMenu.Root>
      <DMTriggerIcon>
        <MultiplayerIcon />
      </DMTriggerIcon>
      <DMContent variant="menu" align="start">
        <DMItem onSelect={handleCreateMultiplayerRoom}>
          <a href="https://tldraw.com/r">Create a Multiplayer Room</a>
        </DMItem>
        <DMItem onSelect={handleCopyToMultiplayerRoom}>Copy to Multiplayer Room</DMItem>
        {room && (
          <>
            <DMDivider />
            <DMItem onSelect={handleCopySelect}>
              Copy Invite Link<SmallIcon>{copied ? <CheckIcon /> : <ClipboardIcon />}</SmallIcon>
            </DMItem>
          </>
        )}
      </DMContent>
    </DropdownMenu.Root>
  )
})
