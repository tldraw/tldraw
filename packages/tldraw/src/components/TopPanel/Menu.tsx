import * as React from 'react'
import { ExitIcon, GitHubLogoIcon, HamburgerMenuIcon, TwitterLogoIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTldrawApp } from '~hooks'
import { PreferencesMenu } from './PreferencesMenu'
import { DMItem, DMContent, DMDivider, DMSubMenu, DMTriggerIcon } from '~components/DropdownMenu'
import { SmallIcon } from '~components/SmallIcon'
import { useFileSystemHandlers } from '~hooks'
import { HeartIcon } from '~components/icons/HeartIcon'

interface MenuProps {
  showSponsorLink: boolean
  readOnly: boolean
}

export const Menu = React.memo(function Menu({ showSponsorLink, readOnly }: MenuProps) {
  const app = useTldrawApp()

  const { onNewProject, onOpenProject, onSaveProject, onSaveProjectAs } = useFileSystemHandlers()

  const handleSignIn = React.useCallback(() => {
    app.callbacks.onSignIn?.(app)
  }, [app])

  const handleSignOut = React.useCallback(() => {
    app.callbacks.onSignOut?.(app)
  }, [app])

  const handleCut = React.useCallback(() => {
    app.cut()
  }, [app])

  const handleCopy = React.useCallback(() => {
    app.copy()
  }, [app])

  const handlePaste = React.useCallback(() => {
    app.paste()
  }, [app])

  const handleCopySvg = React.useCallback(() => {
    app.copySvg()
  }, [app])

  const handleCopyJson = React.useCallback(() => {
    app.copyJson()
  }, [app])

  const handleSelectAll = React.useCallback(() => {
    app.selectAll()
  }, [app])

  const handleselectNone = React.useCallback(() => {
    app.selectNone()
  }, [app])

  const showFileMenu =
    app.callbacks.onNewProject ||
    app.callbacks.onOpenProject ||
    app.callbacks.onSaveProject ||
    app.callbacks.onSaveProjectAs

  const showSignInOutMenu = app.callbacks.onSignIn || app.callbacks.onSignOut || showSponsorLink

  return (
    <DropdownMenu.Root>
      <DMTriggerIcon isSponsor={showSponsorLink}>
        <HamburgerMenuIcon />
      </DMTriggerIcon>
      <DMContent variant="menu">
        {showFileMenu && (
          <DMSubMenu label="File...">
            {app.callbacks.onNewProject && (
              <DMItem onSelect={onNewProject} kbd="#N">
                New Project
              </DMItem>
            )}
            {app.callbacks.onOpenProject && (
              <DMItem onSelect={onOpenProject} kbd="#O">
                Open...
              </DMItem>
            )}
            {app.callbacks.onSaveProject && (
              <DMItem onSelect={onSaveProject} kbd="#S">
                Save
              </DMItem>
            )}
            {app.callbacks.onSaveProjectAs && (
              <DMItem onSelect={onSaveProjectAs} kbd="⇧#S">
                Save As...
              </DMItem>
            )}
          </DMSubMenu>
        )}
        {!readOnly && (
          <>
            <DMSubMenu label="Edit...">
              <DMItem onSelect={app.undo} kbd="#Z">
                Undo
              </DMItem>
              <DMItem onSelect={app.redo} kbd="#⇧Z">
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
          </>
        )}
        <a href="https://Tldraw.com/r">
          <DMItem>Create a Multiplayer Room</DMItem>
        </a>
        <DMDivider dir="ltr" />
        <PreferencesMenu />
        <DMDivider dir="ltr" />
        <a href="https://github.com/Tldraw/Tldraw" target="_blank" rel="nofollow">
          <DMItem>
            Github
            <SmallIcon>
              <GitHubLogoIcon />
            </SmallIcon>
          </DMItem>
        </a>
        <a href="https://twitter.com/Tldraw" target="_blank" rel="nofollow">
          <DMItem>
            Twitter
            <SmallIcon>
              <TwitterLogoIcon />
            </SmallIcon>
          </DMItem>
        </a>
        {showSponsorLink && (
          <a href="https://github.com/sponsors/steveruizok" target="_blank" rel="nofollow">
            <DMItem variant="sponsor">
              Become a Sponsor{' '}
              <SmallIcon>
                <HeartIcon />
              </SmallIcon>
            </DMItem>
          </a>
        )}
        {showSignInOutMenu && (
          <>
            pzoo
            <DMDivider dir="ltr" />{' '}
            {app.callbacks.onSignIn && <DMItem onSelect={handleSignIn}>Sign In</DMItem>}
            {app.callbacks.onSignOut && (
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
