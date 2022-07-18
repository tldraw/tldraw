import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { FormattedMessage } from 'react-intl'
import { styled } from '~styles'
import { useTldrawApp } from '~hooks'
import { TDSnapshot } from '~types'
import { breakpoints } from '~components/breakpoints'
import { GitHubLogoIcon, QuestionMarkIcon, TwitterLogoIcon } from '@radix-ui/react-icons'
import { RowButton } from '~components/Primitives/RowButton'
import { MenuContent } from '~components/Primitives/MenuContent'
import { DMContent, DMDivider } from '~components/Primitives/DropdownMenu'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { DiscordIcon } from '~components/Primitives/icons'
import { LanguageMenu } from '~components/TopPanel/LanguageMenu/LanguageMenu'
import { KeyboardShortcutDialog } from './keyboardShortcutDialog'

const isDebugModeSelector = (s: TDSnapshot) => s.settings.isDebugMode
const dockPositionState = (s: TDSnapshot) => s.settings.dockPosition

export function HelpPanel() {
  const app = useTldrawApp()
  const isDebugMode = app.useStore(isDebugModeSelector)
  const side = app.useStore(dockPositionState)

  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = React.useState(false)

  return (
    <Popover.Root>
      <PopoverAnchor dir="ltr">
        <Popover.Trigger asChild dir="ltr">
          <HelpButton side={side} debug={isDebugMode} bp={breakpoints}>
            <QuestionMarkIcon />
          </HelpButton>
        </Popover.Trigger>
      </PopoverAnchor>
      <Popover.Content dir="ltr">
        <StyledContent style={{ visibility: isKeyboardShortcutsOpen ? 'hidden' : 'visible' }}>
          <LanguageMenuDropdown />
          <KeyboardShortcutDialog onOpenChange={setIsKeyboardShortcutsOpen} />
          <DMDivider />
          <Links />
        </StyledContent>
      </Popover.Content>
    </Popover.Root>
  )
}

const LanguageMenuDropdown = () => {
  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger asChild>
        <RowButton variant="wide" hasArrow>
          <FormattedMessage id="language" />
        </RowButton>
      </DropdownMenu.Trigger>
      <LanguageMenu />
    </DropdownMenu.Root>
  )
}

const linksData = [
  { id: 'github', title: 'Github', icon: GitHubLogoIcon, url: 'https://github.com/tldraw/tldraw' },
  { id: 'twitter', title: 'Twitter', icon: TwitterLogoIcon, url: 'https://twitter.com/tldraw' },
  { id: 'discord', title: 'Discord', icon: DiscordIcon, url: 'https://discord.gg/SBBEVCA4PG' },
]

const Links = () => {
  return (
    <>
      {linksData.map((item) => (
        <a key={item.id} href={item.url} target="_blank" rel="nofollow">
          <RowButton id={`TD-Link-${item.id}`} variant="wide">
            {item.title}
            <SmallIcon>
              <item.icon />
            </SmallIcon>
          </RowButton>
        </a>
      ))}
    </>
  )
}

const HelpButton = styled('button', {
  width: 28,
  height: 28,
  borderRadius: '100%',
  position: 'fixed',
  right: 10,
  display: 'grid',
  placeItems: 'center',
  border: 'none',
  backgroundColor: 'white',
  cursor: 'pointer',
  boxShadow: '$panel',
  bottom: 10,
  variants: {
    debug: {
      true: {},
      false: {},
    },
    bp: {
      mobile: {},
      small: {},
      medium: {},
      large: {},
    },
    side: {
      top: {},
      left: {},
      right: {},
      bottom: {},
    },
  },
  compoundVariants: [
    {
      bp: 'mobile',
      side: 'bottom',
      debug: false,
      css: {
        bottom: 70,
      },
    },
    {
      bp: 'mobile',
      debug: true,
      css: {
        bottom: 50, // 40 + 10
      },
    },
    {
      bp: 'mobile',
      side: 'bottom',
      debug: true,
      css: {
        bottom: 110,
      },
    },
    {
      bp: 'small',
      side: 'bottom',
      debug: true,
      css: {
        bottom: 50,
      },
    },
    {
      bp: 'small',
      debug: false,
      css: {
        bottom: 10,
      },
    },
  ],
})

export const StyledContent = styled(MenuContent, {
  width: 'fit-content',
  height: 'fit-content',
  minWidth: 200,
  maxHeight: 380,
  overflowY: 'auto',
  '& *': {
    boxSizing: 'border-box',
  },
  variants: {
    variant: {
      horizontal: {
        flexDirection: 'row',
      },
      menu: {
        minWidth: 128,
      },
    },
  },
})

const PopoverAnchor = styled(Popover.Anchor, {
  position: 'absolute',
  right: 10,
  zIndex: 999,
  bottom: 50,
})
