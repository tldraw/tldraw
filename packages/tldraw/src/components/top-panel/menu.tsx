import * as React from 'react'
import { ExitIcon, HamburgerMenuIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  DropdownMenuRoot,
  menuContent,
  DropdownMenuSubMenu,
  DropdownMenuButton,
  DropdownMenuDivider,
  iconWrapper,
  Kbd,
} from '~components/shared'
import { useTLDrawContext } from '~hooks'
import { breakpoints, toolButton, toolButtonInner } from '~components'
import { Preferences } from './preferences'

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
    <DropdownMenuRoot>
      <DropdownMenu.Trigger dir="ltr" asChild>
        <button
          className={toolButton({
            bp: breakpoints,
            isActive: false,
          })}
        >
          <div className={toolButtonInner({ isActive: false, bp: breakpoints })}>
            <HamburgerMenuIcon />
          </div>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content dir="ltr" className={menuContent()} sideOffset={8} align="end">
        <DropdownMenuSubMenu label="File...">
          <DropdownMenuButton onSelect={handleNew}>
            <span>New Project</span>
            <Kbd variant="menu">#N</Kbd>
          </DropdownMenuButton>
          <DropdownMenuButton disabled onSelect={handleLoad}>
            <span>Open...</span>
            <Kbd variant="menu">#L</Kbd>
          </DropdownMenuButton>
          <DropdownMenuButton disabled onSelect={handleSave}>
            <span>Save</span>
            <Kbd variant="menu">#S</Kbd>
          </DropdownMenuButton>
          <DropdownMenuButton disabled onSelect={handleSave}>
            <span>Save As...</span>
            <Kbd variant="menu">⇧#S</Kbd>
          </DropdownMenuButton>
        </DropdownMenuSubMenu>
        <DropdownMenuSubMenu label="Edit...">
          <DropdownMenuButton onSelect={tlstate.undo}>
            <span>Undo</span>
            <Kbd variant="menu">#Z</Kbd>
          </DropdownMenuButton>
          <DropdownMenuButton onSelect={tlstate.redo}>
            <span>Redo</span>
            <Kbd variant="menu">#⇧Z</Kbd>
          </DropdownMenuButton>
          <DropdownMenuDivider dir="ltr" />
          <DropdownMenuButton onSelect={tlstate.undo}>
            <span>Copy</span>
            <Kbd variant="menu">#C</Kbd>
          </DropdownMenuButton>
          <DropdownMenuButton onSelect={tlstate.paste}>
            <span>Paste</span>
            <Kbd variant="menu">#V</Kbd>
          </DropdownMenuButton>
          <DropdownMenuDivider dir="ltr" />
          <DropdownMenuButton onSelect={handleCopySvg}>
            <span>Copy to SVG</span>
            <Kbd variant="menu">#⇧C</Kbd>
          </DropdownMenuButton>
          <DropdownMenuButton onSelect={handleCopyJson}>
            <span>Copy to JSON</span>
          </DropdownMenuButton>
          <DropdownMenuDivider dir="ltr" />
          <DropdownMenuButton onSelect={handleSelectAll}>
            <span>Select All</span>
            <Kbd variant="menu">#A</Kbd>
          </DropdownMenuButton>
          <DropdownMenuButton onSelect={handleDeselectAll}>
            <span>Select None</span>
          </DropdownMenuButton>
        </DropdownMenuSubMenu>
        <DropdownMenuDivider dir="ltr" />
        <Preferences />
        <DropdownMenuDivider dir="ltr" />
        <DropdownMenuButton disabled onSelect={handleSignOut}>
          <span>Sign Out</span>
          <div className={iconWrapper({ size: 'small' })}>
            <ExitIcon />
          </div>
        </DropdownMenuButton>
      </DropdownMenu.Content>
    </DropdownMenuRoot>
  )
})
