import * as React from 'react'
import { ExitIcon, HamburgerMenuIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  floatingContainer,
  DropdownMenuRoot,
  menuContent,
  iconButton,
  breakpoints,
  DropdownMenuButton,
  DropdownMenuSubMenu,
  DropdownMenuDivider,
  iconWrapper,
  kbd,
} from '~components/shared'
import { useTLDrawContext } from '~hooks'
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

  return (
    <div className={floatingContainer()}>
      <DropdownMenuRoot>
        <DropdownMenu.Trigger className={iconButton({ bp: breakpoints })}>
          <HamburgerMenuIcon />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content className={menuContent()} sideOffset={8} align="end">
          <DropdownMenuButton onSelect={handleNew}>
            <span>New Project</span>
            <kbd className={kbd({ variant: 'menu' })}>#N</kbd>
          </DropdownMenuButton>
          <DropdownMenuDivider />
          <DropdownMenuButton disabled onSelect={handleLoad}>
            <span>Open...</span>
            <kbd className={kbd({ variant: 'menu' })}>#L</kbd>
          </DropdownMenuButton>
          <RecentFiles />
          <DropdownMenuDivider />
          <DropdownMenuButton disabled onSelect={handleSave}>
            <span>Save</span>
            <kbd className={kbd({ variant: 'menu' })}>#S</kbd>
          </DropdownMenuButton>
          <DropdownMenuButton disabled onSelect={handleSave}>
            <span>Save As...</span>
            <kbd className={kbd({ variant: 'menu' })}>⇧#S</kbd>
          </DropdownMenuButton>
          <DropdownMenuDivider />
          <Preferences />
          <DropdownMenuDivider />
          <DropdownMenuButton disabled onSelect={handleSignOut}>
            <span>Sign Out</span>
            <div className={iconWrapper({ size: 'small' })}>
              <ExitIcon />
            </div>
          </DropdownMenuButton>
        </DropdownMenu.Content>
      </DropdownMenuRoot>
    </div>
  )
})

function RecentFiles() {
  return (
    <DropdownMenuSubMenu label="Open Recent..." disabled={true}>
      <DropdownMenuButton>
        <span>Project A</span>
      </DropdownMenuButton>
      <DropdownMenuButton>
        <span>Project B</span>
      </DropdownMenuButton>
      <DropdownMenuButton>
        <span>Project C</span>
      </DropdownMenuButton>
    </DropdownMenuSubMenu>
  )
}
