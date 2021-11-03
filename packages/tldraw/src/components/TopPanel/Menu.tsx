import * as React from 'react'
import { ExitIcon, HamburgerMenuIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTLDrawContext } from '~hooks'
import { PreferencesMenu } from './PreferencesMenu'
import { DMItem, DMContent, DMDivider, DMSubMenu, DMTriggerIcon } from '~components/DropdownMenu'
import { SmallIcon } from '~components/SmallIcon'

export const Menu = React.memo(() => {
  const { tlstate } = useTLDrawContext()

  const handleNew = React.useCallback(() => {
    if (window.confirm('Are you sure you want to start a new project?')) {
      tlstate.newProject()
    }
  }, [tlstate])

  const handleSave = React.useCallback(() => {
    tlstate.saveProject()
  }, [tlstate])

  const handleLoad = React.useCallback(() => {
    tlstate.loadProject()
  }, [tlstate])

  const handleSignOut = React.useCallback(() => {
    tlstate.signOut()
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
          <DMItem onSelect={handleNew} kbd="#N">
            New Project
          </DMItem>
          <DMItem disabled onSelect={handleLoad} kbd="#L">
            Open...
          </DMItem>
          <DMItem disabled onSelect={handleSave} kbd="#S">
            Save
          </DMItem>
          <DMItem disabled onSelect={handleSave} kbd="⇧#S">
            Save As...
          </DMItem>
        </DMSubMenu>
        <DMSubMenu label="Edit...">
          <DMItem onSelect={tlstate.undo} kbd="#Z">
            Undo
          </DMItem>
          <DMItem onSelect={tlstate.redo} kbd="#⇧Z">
            Redo
          </DMItem>
          <DMDivider dir="ltr" />
          <DMItem onSelect={tlstate.undo} kbd="#C">
            Copy
          </DMItem>
          <DMItem onSelect={tlstate.paste} kbd="#V">
            Paste
          </DMItem>
          <DMDivider dir="ltr" />
          <DMItem onSelect={handleCopySvg} kbd="#⇧C">
            Copy to SVG
          </DMItem>
          <DMItem onSelect={handleCopyJson}>Copy to JSON</DMItem>
          <DMDivider dir="ltr" />
          <DMItem onSelect={handleSelectAll} kbd="#A">
            Select All
          </DMItem>
          <DMItem onSelect={handleDeselectAll}>Select None</DMItem>
        </DMSubMenu>
        <DMDivider dir="ltr" />
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
