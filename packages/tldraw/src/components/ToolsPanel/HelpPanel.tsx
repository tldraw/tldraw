import * as React from 'react'
import { Item } from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import { useIntl } from 'react-intl'
import { QuestionMarkIcon } from '~components/Primitives/icons'
import { Kbd } from '~components/Primitives/Kbd'
import { Tooltip } from '~components/Primitives/Tooltip'
import { styled } from '~styles'
import { useTldrawApp } from '~hooks'
import { TDSnapshot } from '~types'

const isDebugModeSelector = (s: TDSnapshot) => s.settings.isDebugMode

export function HelpPanel() {
  const intl = useIntl()
  const app = useTldrawApp()
  const isDebugMode = app.useStore(isDebugModeSelector)

  const shortcuts = [
    { label: intl.formatMessage({ id: 'new.project' }), kbd: '#N' },
    { label: intl.formatMessage({ id: 'open' }), kbd: '#O' },
    { label: intl.formatMessage({ id: 'save' }), kbd: '#S' },
    { label: intl.formatMessage({ id: 'save.as' }), kbd: '#⇧S' },
    { label: intl.formatMessage({ id: 'upload.media' }), kbd: '#U' },
  ]

  return (
    <Popover.Root>
      <PopoverAnchor>
        <Popover.Trigger asChild>
          <HelpButton debug={isDebugMode}>
            <QuestionMarkIcon />
          </HelpButton>
        </Popover.Trigger>
      </PopoverAnchor>
      <PopoverContent>
        <ListItems>
          {shortcuts.map((shortcut) => (
            <ListItem key={shortcut.label}>
              <Text>{shortcut.label}</Text>
              <Kbd variant="menu">{shortcut.kbd}</Kbd>
            </ListItem>
          ))}
        </ListItems>
      </PopoverContent>
    </Popover.Root>
  )
}

const HelpButton = styled('button', {
  width: 40,
  height: 40,
  borderRadius: '100%',
  position: 'fixed',
  bottom: 0,
  right: 10,
  display: 'grid',
  placeItems: 'center',
  border: 'none',
  backgroundColor: 'white',
  cursor: 'pointer',
  variants: {
    debug: {
      true: {},
      false: {},
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
      css: {
        bottom: 10,
      },
    },
  ],
})

const ListItems = styled('ul', {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  paddingLeft: 0,
  margin: 0,
  gap: 10,
})

const ListItem = styled('li', {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  height: 'auto',
})

const Text = styled('h3', {
  fontSize: '$1',
  fontWeight: '400',
  margin: 0,
})

const PopoverContent = styled(Popover.Content, {
  boxShadow: '1px 1px 8px -2px rgba(0, 0, 0, 0.25)',
  borderRadius: 8,
  padding: 12,
  backgroundColor: '#fff',
  minWidth: 200,
})

const PopoverAnchor = styled(Popover.Anchor, {
  position: 'absolute',
  bottom: 60,
  right: 10,
  zIndex: 999,
})
