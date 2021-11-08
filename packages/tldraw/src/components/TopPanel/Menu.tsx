import * as React from 'react'
import { ExitIcon, HamburgerMenuIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTLDrawContext } from '~hooks'
import { PreferencesMenu } from './PreferencesMenu'
import { DMItem, DMContent, DMDivider, DMSubMenu, DMTriggerIcon } from '~components/DropdownMenu'
import { SmallIcon } from '~components/SmallIcon'
import { useFileSystemHandlers } from '~hooks'

interface MenuProps {
  readOnly: boolean
}

export const Menu = React.memo(function Menu({ readOnly }: MenuProps) {
  const { tlstate } = useTLDrawContext()

  const { onNewProject, onOpenProject, onSaveProject, onSaveProjectAs } = useFileSystemHandlers()

  const handleSignIn = React.useCallback(() => {
    tlstate.callbacks.onSignIn?.(tlstate)
  }, [tlstate])

  const handleSignOut = React.useCallback(() => {
    tlstate.callbacks.onSignOut?.(tlstate)
  }, [tlstate])

  const handleCut = React.useCallback(() => {
    tlstate.cut()
  }, [tlstate])

  const handleCopy = React.useCallback(() => {
    tlstate.copy()
  }, [tlstate])

  const handlePaste = React.useCallback(() => {
    tlstate.paste()
  }, [tlstate])

  const handleCopySvg = React.useCallback(() => {
    tlstate.copySvg()
  }, [tlstate])

  const handleCopyJson = React.useCallback(() => {
    tlstate.copyJson()
  }, [tlstate])

  const handleSelectAll = React.useCallback(() => {
    tlstate.selectAll()
  }, [tlstate])

  const handleselectNone = React.useCallback(() => {
    tlstate.selectNone()
  }, [tlstate])

  const showFileMenu =
    tlstate.callbacks.onNewProject ||
    tlstate.callbacks.onOpenProject ||
    tlstate.callbacks.onSaveProject ||
    tlstate.callbacks.onSaveProjectAs

  const showSignInOutMenu = tlstate.callbacks.onSignIn || tlstate.callbacks.onSignOut

  return (
    <DropdownMenu.Root>
      <DMTriggerIcon>
        <HamburgerMenuIcon />
      </DMTriggerIcon>
      <DMContent variant="menu">
        {showFileMenu && (
          <DMSubMenu label="File...">
            {tlstate.callbacks.onNewProject && (
              <DMItem onSelect={onNewProject} kbd="#N">
                New Project
              </DMItem>
            )}
            {tlstate.callbacks.onOpenProject && (
              <DMItem onSelect={onOpenProject} kbd="#O">
                Open...
              </DMItem>
            )}
            {tlstate.callbacks.onSaveProject && (
              <DMItem onSelect={onSaveProject} kbd="#S">
                Save
              </DMItem>
            )}
            {tlstate.callbacks.onSaveProjectAs && (
              <DMItem onSelect={onSaveProjectAs} kbd="⇧#S">
                Save As...
              </DMItem>
            )}
          </DMSubMenu>
        )}
        {!readOnly && (
          <>
            <DMSubMenu label="Edit...">
              <DMItem onSelect={tlstate.undo} kbd="#Z">
                Undo
              </DMItem>
              <DMItem onSelect={tlstate.redo} kbd="#⇧Z">
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
        <PreferencesMenu />
        {showSignInOutMenu && (
          <>
            <DMDivider dir="ltr" />{' '}
            {tlstate.callbacks.onSignIn && <DMItem onSelect={handleSignIn}>Sign In</DMItem>}
            {tlstate.callbacks.onSignOut && (
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
