import * as React from 'react'
import { ExitIcon, HamburgerMenuIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTLDrawContext } from '~hooks'
import { PreferencesMenu } from './PreferencesMenu'
import { DMItem, DMContent, DMDivider, DMSubMenu, DMTriggerIcon } from '~components/DropdownMenu'
import { SmallIcon } from '~components/SmallIcon'
import { useFileSystemHandlers } from '~hooks'

interface MenuProps {
  showSponsorLink: boolean
  readOnly: boolean
}

export const Menu = React.memo(function Menu({ showSponsorLink, readOnly }: MenuProps) {
  const { state } = useTLDrawContext()

  const { onNewProject, onOpenProject, onSaveProject, onSaveProjectAs } = useFileSystemHandlers()

  const handleSignIn = React.useCallback(() => {
    state.callbacks.onSignIn?.(state)
  }, [state])

  const handleSignOut = React.useCallback(() => {
    state.callbacks.onSignOut?.(state)
  }, [state])

  const handleCut = React.useCallback(() => {
    state.cut()
  }, [state])

  const handleCopy = React.useCallback(() => {
    state.copy()
  }, [state])

  const handlePaste = React.useCallback(() => {
    state.paste()
  }, [state])

  const handleCopySvg = React.useCallback(() => {
    state.copySvg()
  }, [state])

  const handleCopyJson = React.useCallback(() => {
    state.copyJson()
  }, [state])

  const handleSelectAll = React.useCallback(() => {
    state.selectAll()
  }, [state])

  const handleselectNone = React.useCallback(() => {
    state.selectNone()
  }, [state])

  const showFileMenu =
    state.callbacks.onNewProject ||
    state.callbacks.onOpenProject ||
    state.callbacks.onSaveProject ||
    state.callbacks.onSaveProjectAs

  const showSignInOutMenu = state.callbacks.onSignIn || state.callbacks.onSignOut || showSponsorLink

  return (
    <DropdownMenu.Root>
      <DMTriggerIcon isSponsor={showSponsorLink}>
        <HamburgerMenuIcon />
      </DMTriggerIcon>
      <DMContent variant="menu">
        {showFileMenu && (
          <DMSubMenu label="File...">
            {state.callbacks.onNewProject && (
              <DMItem onSelect={onNewProject} kbd="#N">
                New Project
              </DMItem>
            )}
            {state.callbacks.onOpenProject && (
              <DMItem onSelect={onOpenProject} kbd="#O">
                Open...
              </DMItem>
            )}
            {state.callbacks.onSaveProject && (
              <DMItem onSelect={onSaveProject} kbd="#S">
                Save
              </DMItem>
            )}
            {state.callbacks.onSaveProjectAs && (
              <DMItem onSelect={onSaveProjectAs} kbd="⇧#S">
                Save As...
              </DMItem>
            )}
          </DMSubMenu>
        )}
        {!readOnly && (
          <>
            <DMSubMenu label="Edit...">
              <DMItem onSelect={state.undo} kbd="#Z">
                Undo
              </DMItem>
              <DMItem onSelect={state.redo} kbd="#⇧Z">
                Redo
              </DMItem>
              <DMDivider dir="ltr" />
              <DMItem onSelect={handleCut} kbd="#X">
                Cut
              </DMItem>
              <DMItem onSelect={handleCopy} kbd="#C">
                Copy
              </DMItem>
              <DMItem onSelect={handlePaste} kbd="#V">
                Paste
              </DMItem>
              <DMDivider dir="ltr" />
              <DMItem onSelect={handleCopySvg} kbd="#⇧C">
                Copy as SVG
              </DMItem>
              <DMItem onSelect={handleCopyJson}>Copy as JSON</DMItem>
              <DMDivider dir="ltr" />
              <DMItem onSelect={handleSelectAll} kbd="#A">
                Select All
              </DMItem>
              <DMItem onSelect={handleselectNone}>Select None</DMItem>
            </DMSubMenu>
            <DMDivider dir="ltr" />
          </>
        )}
        <a href="https://tldraw.com/r">
          <DMItem>Create a Multiplayer Room</DMItem>
        </a>
        <DMDivider dir="ltr" /> <PreferencesMenu />
        {showSignInOutMenu && (
          <>
            <DMDivider dir="ltr" />{' '}
            {showSponsorLink && (
              <a href="https://github.com/sponsors/steveruizok" target="_blank" rel="nofollow">
                <DMItem variant="sponsor">Become a Sponsor</DMItem>
              </a>
            )}
            {state.callbacks.onSignIn && <DMItem onSelect={handleSignIn}>Sign In</DMItem>}
            {state.callbacks.onSignOut && (
              <DMItem onSelect={handleSignOut}>
                Sign Out
                <SmallIcon>
                  <ExitIcon />
                </SmallIcon>
              </DMItem>
            )}
          </>
        )}
      </DMContent>
    </DropdownMenu.Root>
  )
})
