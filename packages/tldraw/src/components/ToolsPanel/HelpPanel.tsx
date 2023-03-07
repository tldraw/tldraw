import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ExternalLinkIcon,
  GitHubLogoIcon,
  HeartFilledIcon,
  QuestionMarkIcon,
  TwitterLogoIcon,
} from '@radix-ui/react-icons'
import * as Popover from '@radix-ui/react-popover'
import * as React from 'react'
import { FormattedMessage } from 'react-intl'
import { Divider } from '~components/Primitives/Divider'
import { MenuContent } from '~components/Primitives/MenuContent'
import { RowButton } from '~components/Primitives/RowButton'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { DiscordIcon } from '~components/Primitives/icons'
import { LanguageMenu } from '~components/TopPanel/LanguageMenu/LanguageMenu'
import { breakpoints } from '~components/breakpoints'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { TDSnapshot } from '~types'
import { KeyboardShortcutDialog } from './KeyboardShortcutDialog'

const isDebugModeSelector = (s: TDSnapshot) => s.settings.isDebugMode
const dockPositionState = (s: TDSnapshot) => s.settings.dockPosition

export function HelpPanel() {
  const app = useTldrawApp()
  const isDebugMode = app.useStore(isDebugModeSelector)
  const side = app.useStore(dockPositionState)

  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = React.useState(false)

  return (
    <Popover.Root>
      <PopoverAnchor dir="ltr" debug={isDebugMode} side={side} bp={breakpoints}>
        <Popover.Trigger dir="ltr" asChild>
          <HelpButton>
            <QuestionMarkIcon />
          </HelpButton>
        </Popover.Trigger>
      </PopoverAnchor>
      <Popover.Content dir="ltr" align="end" side="top" alignOffset={10} sideOffset={8} asChild>
        <StyledContent style={{ visibility: isKeyboardShortcutsOpen ? 'hidden' : 'visible' }}>
          <LanguageMenuDropdown />
          <KeyboardShortcutDialog onOpenChange={setIsKeyboardShortcutsOpen} />
          <Divider />
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
  { id: 'tldraw-beta', icon: ExternalLinkIcon, url: 'https://beta.tldraw.com' },
  { id: 'github', icon: GitHubLogoIcon, url: 'https://github.com/tldraw/tldraw' },
  { id: 'twitter', icon: TwitterLogoIcon, url: 'https://twitter.com/tldraw' },
  { id: 'discord', icon: DiscordIcon, url: 'https://discord.gg/SBBEVCA4PG' },
  {
    id: 'become.a.sponsor',
    icon: HeartFilledIcon,
    url: 'https://github.com/sponsors/steveruizok',
  },
]

const Links = () => {
  return (
    <>
      {linksData.map((item) => (
        <a key={item.id} href={item.url} target="_blank" rel="nofollow">
          <RowButton id={`TD-Link-${item.id}`} variant="wide">
            <FormattedMessage id={item.id} />
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
  width: 32,
  height: 32,
  borderRadius: '100%',
  display: 'flex',
  padding: 0,
  justifyContent: 'center',
  alignItems: 'center',
  outline: 'none',
  backgroundColor: '$panel',
  cursor: 'pointer',
  boxShadow: '$panel',
  border: '1px solid $panelContrast',
  color: '$text',
  '& svg': {
    height: 12,
    width: 12,
  },
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
  '& a': {
    outline: 'none',
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
  zIndex: 999,
  right: 10,
  bottom: 10,
  width: 32,
  height: 32,
  variants: {
    debug: {
      true: {},
      false: {},
    },
    bp: {
      mobile: {
        bottom: 64,
      },
      small: {
        bottom: 20,
      },
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
      debug: true,
      css: {
        bottom: 50,
      },
    },
    {
      bp: 'mobile',
      side: 'bottom',
      debug: true,
      css: {
        bottom: 104,
      },
    },
    {
      bp: 'small',
      side: 'bottom',
      debug: true,
      css: {
        bottom: 60,
      },
    },
    {
      bp: 'small',
      side: 'bottom',
      debug: true,
      css: {
        bottom: 60,
      },
    },
  ],
})
