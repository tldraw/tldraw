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

export const Menu = React.memo(({ readOnly }: MenuProps) => {
  const { tlstate, callbacks } = useTLDrawContext()

  const { onNewProject, onOpenProject, onSaveProject, onSaveProjectAs } = useFileSystemHandlers()

  const handleSignIn = React.useCallback(() => {
    callbacks.onSignIn?.(tlstate)
  }, [tlstate])

  const handleSignOut = React.useCallback(() => {
    callbacks.onSignOut?.(tlstate)
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

  const handleDeselectAll = React.useCallback(() => {
    tlstate.deselectAll()
  }, [tlstate])

  const showFileMenu =
    callbacks.onNewProject ||
    callbacks.onOpenProject ||
    callbacks.onSaveProject ||
    callbacks.onSaveProjectAs

  const showSignInOutMenu = callbacks.onSignIn || callbacks.onSignOut

  return (
    <DropdownMenu.Root>
      <DMTriggerIcon>
        <HamburgerMenuIcon />
      </DMTriggerIcon>
      <DMContent variant="menu">
        {showFileMenu && (
          <DMSubMenu label="File...">
            {callbacks.onNewProject && (
              <DMItem onSelect={onNewProject} kbd="#N">
                New Project
              </DMItem>
            )}
            {callbacks.onOpenProject && (
              <DMItem onSelect={onOpenProject} kbd="#L">
                Open...
              </DMItem>
            )}
            {callbacks.onSaveProject && (
              <DMItem onSelect={onSaveProject} kbd="#S">
                Save
              </DMItem>
            )}
            {callbacks.onSaveProjectAs && (
              <DMItem onSelect={onSaveProjectAs} kbd="⇧#S">
                Save As...
              </DMItem>
            )}
          </DMSubMenu>
        )}
        {!readOnly && (
          <>
            {' '}
            <DMSubMenu label="Edit...">
              <DMItem onSelect={tlstate.undo} kbd="#Z">
                Undo
              </DMItem>
              <DMItem onSelect={tlstate.redo} kbd="#⇧Z">
                Redo
              </DMItem>
              <DMDivider dir="ltr" />
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
              <DMItem onSelect={handleDeselectAll}>Select None</DMItem>
            </DMSubMenu>
            <DMDivider dir="ltr" />
          </>
        )}
        <PreferencesMenu />
        {showSignInOutMenu && (
          <>
            <DMDivider dir="ltr" />{' '}
            {callbacks.onSignIn && <DMItem onSelect={handleSignOut}>Sign In</DMItem>}
            {callbacks.onSignOut && (
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
