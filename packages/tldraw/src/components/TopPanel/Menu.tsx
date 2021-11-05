import * as React from 'react'
import { ExitIcon, HamburgerMenuIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTLDrawContext } from '~hooks'
import { PreferencesMenu } from './PreferencesMenu'
import { DMItem, DMContent, DMDivider, DMSubMenu, DMTriggerIcon } from '~components/DropdownMenu'
import { SmallIcon } from '~components/SmallIcon'
import { useFileSystem } from '~hooks'

interface MenuProps {
  readOnly: boolean
}

export const Menu = React.memo(({ readOnly }: MenuProps) => {
  const { tlstate } = useTLDrawContext()

  const { onNewProject, onOpenProject, onSaveProject, onSaveProjectAs } = useFileSystem()

  const handleSignOut = React.useCallback(() => {
    tlstate.signOut()
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

  return (
    <DropdownMenu.Root>
      <DMTriggerIcon>
        <HamburgerMenuIcon />
      </DMTriggerIcon>
      <DMContent variant="menu">
        <DMSubMenu label="File...">
          <DMItem onSelect={onNewProject} kbd="#N">
            New Project
          </DMItem>
          <DMItem disabled onSelect={onOpenProject} kbd="#L">
            Open...
          </DMItem>
          <DMItem disabled onSelect={onSaveProject} kbd="#S">
            Save
          </DMItem>
          <DMItem disabled onSelect={onSaveProjectAs} kbd="⇧#S">
            Save As...
          </DMItem>
        </DMSubMenu>
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
        <DMDivider dir="ltr" />
        <DMItem disabled onSelect={handleSignOut}>
          Sign Out
          <SmallIcon>
            <ExitIcon />
          </SmallIcon>
        </DMItem>
      </DMContent>
    </DropdownMenu.Root>
  )
})
