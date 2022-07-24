import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { FormattedMessage } from 'react-intl'
import { styled } from '~styles'
import { useTldrawApp } from '~hooks'
import { TDDockPosition, TDSnapshot } from '~types'
import { breakpoints } from '~components/breakpoints'
import {
  GitHubLogoIcon,
  QuestionMarkIcon,
  HeartFilledIcon,
  TwitterLogoIcon,
} from '@radix-ui/react-icons'
import { RowButton } from '~components/Primitives/RowButton'
import { MenuContent } from '~components/Primitives/MenuContent'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { DiscordIcon } from '~components/Primitives/icons'
import LanguageMenu from '~components/TopPanel/LanguageMenu/LanguageMenu'
import { KeyboardShortcutDialog } from './keyboardShortcutDialog'
import { Divider } from '~components/Primitives/Divider'

const isDebugModeSelector = (s: TDSnapshot) => s.settings.isDebugMode
const dockPositionState = (s: TDSnapshot) => s.settings.dockPosition

export function HelpPanel() {
  const app = useTldrawApp()
  const isDebugMode = app.useStore(isDebugModeSelector)
  const side = app.useStore(dockPositionState)

  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = React.useState(false)

  return (
    <Popover.Root>
      <PopoverAnchor dir="ltr" debug={isDebugMode}>
        <Popover.Trigger dir="ltr" asChild>
          <HelpButton side={side} debug={isDebugMode} bp={breakpoints}>
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
  width: 28,
  height: 28,
  borderRadius: '100%',
  position: 'absolute',
  right: 10,
  bottom: 10,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  outline: 'none',
  backgroundColor: '$panel',
  cursor: 'pointer',
  boxShadow: '$panel',
  border: '1px solid $panelContrast',
  color: '$text',
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
      css: {
        bottom: 70,
      },
    },
    {
      bp: 'small',
      side: 'bottom',
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
  right: 0,
  bottom: 0,
  width: 40,
  height: 40,
  variants: {
    debug: {
      true: {
        bottom: 40,
      },
    },
  },
})
