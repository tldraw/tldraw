import * as React from 'react'
import { ExitIcon, HamburgerMenuIcon } from '@radix-ui/react-icons'
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
  IconWrapper,
  Kbd,
} from '../shared'
import state, { useSelector } from 'state'
import { commandKey } from 'utils'
import { signOut } from 'next-auth/client'
import { useTheme } from 'next-themes'

const handleNew = () => state.send('CREATED_NEW_PROJECT')
const handleSave = () => state.send('SAVED')
const handleLoad = () => state.send('LOADED_FROM_FILE_STSTEM')
const toggleDebugMode = () => state.send('TOGGLED_DEBUG_MODE')

function Menu() {
  return (
    <FloatingContainer>
      <DropdownMenuRoot>
        <IconButton as={Trigger} bp={breakpoints}>
          <HamburgerMenuIcon />
        </IconButton>
        <Content as={MenuContent} sideOffset={8} align="start">
          <DropdownMenuButton onSelect={handleNew} disabled>
            <span>New Project</span>
            <Kbd>
              <span>{commandKey()}</span>
              <span>N</span>
            </Kbd>
          </DropdownMenuButton>
          <DropdownMenuDivider />
          <DropdownMenuButton onSelect={handleLoad}>
            <span>Open...</span>
            <Kbd>
              <span>{commandKey()}</span>
              <span>L</span>
            </Kbd>
          </DropdownMenuButton>
          <RecentFiles />
          <DropdownMenuDivider />
          <DropdownMenuButton onSelect={handleSave}>
            <span>Save</span>
            <Kbd>
              <span>{commandKey()}</span>
              <span>S</span>
            </Kbd>
          </DropdownMenuButton>
          <DropdownMenuButton onSelect={handleSave}>
            <span>Save As...</span>
            <Kbd>
              <span>⇧</span>
              <span>{commandKey()}</span>
              <span>S</span>
            </Kbd>
          </DropdownMenuButton>
          <DropdownMenuDivider />
          <Preferences />
          <DropdownMenuDivider />
          <DropdownMenuButton onSelect={signOut}>
            <span>Sign Out</span>
            <IconWrapper size="small">
              <ExitIcon />
            </IconWrapper>
          </DropdownMenuButton>
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
  const { theme, setTheme } = useTheme()

  const isDebugMode = useSelector((s) => s.data.settings.isDebugMode)
  const isDarkMode = theme === 'dark'

  return (
    <DropdownMenuSubMenu label="Preferences">
      <DropdownMenuCheckboxItem
        checked={isDarkMode}
        onCheckedChange={() => setTheme(isDarkMode ? 'light' : 'dark')}
      >
        <span>Dark Mode</span>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        checked={isDebugMode}
        onCheckedChange={toggleDebugMode}
      >
        <span>Debug Mode</span>
      </DropdownMenuCheckboxItem>
    </DropdownMenuSubMenu>
  )
}
