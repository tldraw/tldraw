import * as React from 'react'
import { HamburgerMenuIcon } from '@radix-ui/react-icons'
import { Trigger, Content } from '@radix-ui/react-dropdown-menu'
import { memo } from 'react'
import {
  FloatingContainer,
  DropdownMenuRoot,
  MenuContent,
  IconButton,
  breakpoints,
  DropdownMenuButton,
  DropdownMenuSubMenu,
  DropdownMenuDivider,
  DropdownMenuCheckboxItem,
} from '../shared'
import state, { useSelector } from 'state'
import { commandKey } from 'utils'

const handleNew = () => state.send('CREATED_NEW_PROJECT')
const handleSave = () => state.send('SAVED')
const handleLoad = () => state.send('LOADED_FROM_FILE_STSTEM')
const toggleDarkMode = () => state.send('TOGGLED_DARK_MODE')

function Menu() {
  return (
    <FloatingContainer>
      <DropdownMenuRoot>
        <IconButton as={Trigger} bp={breakpoints}>
          <HamburgerMenuIcon />
        </IconButton>
        <Content as={MenuContent} sideOffset={8}>
          <DropdownMenuButton onSelect={handleNew} disabled>
            <span>New Project</span>
            <kbd>
              <span>{commandKey()}</span>
              <span>N</span>
            </kbd>
          </DropdownMenuButton>
          <DropdownMenuDivider />
          <DropdownMenuButton onSelect={handleLoad}>
            <span>Open...</span>
            <kbd>
              <span>{commandKey()}</span>
              <span>L</span>
            </kbd>
          </DropdownMenuButton>
          <RecentFiles />
          <DropdownMenuDivider />
          <DropdownMenuButton onSelect={handleSave}>
            <span>Save</span>
            <kbd>
              <span>{commandKey()}</span>
              <span>S</span>
            </kbd>
          </DropdownMenuButton>
          <DropdownMenuButton onSelect={handleSave}>
            <span>Save As...</span>
            <kbd>
              <span>⇧</span>
              <span>{commandKey()}</span>
              <span>S</span>
            </kbd>
          </DropdownMenuButton>
          <DropdownMenuDivider />
          <Preferences />
        </Content>
      </DropdownMenuRoot>
    </FloatingContainer>
  )
}

export default memo(Menu)

function RecentFiles() {
  return (
    <DropdownMenuSubMenu label="Open Recent..." disabled>
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

function Preferences() {
  const isDarkMode = useSelector((s) => s.data.settings.isDarkMode)

  return (
    <DropdownMenuSubMenu label="Preferences">
      <DropdownMenuCheckboxItem
        checked={isDarkMode}
        onCheckedChange={toggleDarkMode}
      >
        <span>Dark Mode</span>
      </DropdownMenuCheckboxItem>
    </DropdownMenuSubMenu>
  )
}
