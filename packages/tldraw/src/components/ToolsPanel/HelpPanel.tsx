import * as React from 'react'
import { Separator } from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import { useIntl } from 'react-intl'
import { QuestionMarkIcon } from '~components/Primitives/icons'
import { Kbd } from '~components/Primitives/Kbd'
import { styled } from '~styles'
import { useTldrawApp } from '~hooks'
import { TDSnapshot } from '~types'
import { breakpoints } from '~components/breakpoints'

const isDebugModeSelector = (s: TDSnapshot) => s.settings.isDebugMode
const dockPositionState = (s: TDSnapshot) => s.settings.dockPosition

export function HelpPanel() {
  const intl = useIntl()
  const app = useTldrawApp()
  const isDebugMode = app.useStore(isDebugModeSelector)
  const side = app.useStore(dockPositionState)

  const shortcuts = [
    { label: intl.formatMessage({ id: 'new.project' }), kbd: '#N' },
    { label: intl.formatMessage({ id: 'open' }), kbd: '#O' },
    { label: intl.formatMessage({ id: 'save' }), kbd: '#S' },
    { label: intl.formatMessage({ id: 'save.as' }), kbd: '#⇧S' },
    { label: intl.formatMessage({ id: 'upload.media' }), kbd: '#U' },
    { label: intl.formatMessage({ id: 'undo' }), kbd: '#Z', newSection: true },
    { label: intl.formatMessage({ id: 'redo' }), kbd: '#⇧Z' },
    { label: intl.formatMessage({ id: 'cut' }), kbd: '#X' },
    { label: intl.formatMessage({ id: 'copy' }), kbd: '#C' },
    { label: intl.formatMessage({ id: 'paste' }), kbd: '#V' },
    { label: intl.formatMessage({ id: 'select.all' }), kbd: '#A' },
    { label: intl.formatMessage({ id: 'delete' }), kbd: '⌫' },
    { label: intl.formatMessage({ id: 'zoom.in' }), kbd: '#+', newSection: true },
    { label: intl.formatMessage({ id: 'zoom.out' }), kbd: '#-' },
    { label: `${intl.formatMessage({ id: 'zoom.to' })} 100%`, kbd: '⇧+0' },
    { label: intl.formatMessage({ id: 'zoom.to.fit' }), kbd: '⇧+1' },
    { label: intl.formatMessage({ id: 'zoom.to.selection' }), kbd: '⇧+2' },
    { label: intl.formatMessage({ id: 'preferences.dark.mode' }), kbd: '#⇧D', newSection: true },
    { label: intl.formatMessage({ id: 'preferences.focus.mode' }), kbd: '#.' },
    { label: intl.formatMessage({ id: 'preferences.show.grid' }), kbd: '#⇧G' },
    { label: intl.formatMessage({ id: 'duplicate' }), kbd: '#D', newSection: true },
    { label: intl.formatMessage({ id: 'flip.horizontal' }), kbd: '⇧H' },
    { label: intl.formatMessage({ id: 'flip.vertical' }), kbd: '⇧V' },
    {
      label: `${intl.formatMessage({ id: 'lock' })} / ${intl.formatMessage({ id: 'unlock' })}`,
      kbd: '#⇧L',
    },
    {
      label: `${intl.formatMessage({ id: 'move' })} ${intl.formatMessage({ id: 'to.front' })}`,
      kbd: '⇧]',
      newSection: true,
    },
    {
      label: `${intl.formatMessage({ id: 'move' })} ${intl.formatMessage({ id: 'forward' })}`,
      kbd: ']',
    },
    {
      label: `${intl.formatMessage({ id: 'move' })} ${intl.formatMessage({ id: 'backward' })}`,
      kbd: '[',
    },
    {
      label: `${intl.formatMessage({ id: 'move' })} ${intl.formatMessage({ id: 'back' })}`,
      kbd: '⇧[',
    },
  ]

  return (
    <Popover.Root>
      <PopoverAnchor>
        <Popover.Trigger asChild>
          <HelpButton side={side} debug={isDebugMode} bp={breakpoints}>
            <QuestionMarkIcon />
          </HelpButton>
        </Popover.Trigger>
      </PopoverAnchor>
      <PopoverContent>
        <ListItems>
          {shortcuts.map((shortcut) => (
            <div key={shortcut.label}>
              {shortcut.newSection && <Divider />}
              <ListItem key={shortcut.label}>
                <Text>{shortcut.label}</Text>
                <Kbd variant="menu">{shortcut.kbd}</Kbd>
              </ListItem>
            </div>
          ))}
        </ListItems>
      </PopoverContent>
    </Popover.Root>
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
      top: {
        bottom: 10,
      },
      left: {
        bottom: 10,
      },
      right: {
        bottom: 10,
      },
      bottom: {
        bottom: 10,
      },
    },
  },
  compoundVariants: [
    {
      bp: 'mobile',
      side: 'bottom',
      debug: false,
      css: {
        bottom: 60,
      },
    },
    {
      bp: 'mobile',
      side: 'bottom',
      debug: true,
      css: {
        bottom: 100,
      },
    },
    {
      bp: 'large',
      side: 'bottom',
      debug: true,
      css: {
        bottom: 50,
      },
    },
    {
      bp: 'large',
      side: 'bottom',
      debug: false,
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
  gap: 14,
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
  fontFamily: '$ui',
})

const PopoverContent = styled(Popover.Content, {
  boxShadow: '1px 1px 8px -2px rgba(0, 0, 0, 0.25)',
  borderRadius: 8,
  padding: 12,
  backgroundColor: '#fff',
  minWidth: 200,
  maxHeight: 380,
  overflowY: 'auto',
})

const PopoverAnchor = styled(Popover.Anchor, {
  position: 'absolute',
  right: 10,
  zIndex: 999,
  bottom: 50,
})

const Divider = styled(Separator, {
  backgroundColor: '$hover',
  height: 1,
  marginTop: '$2',
  marginRight: '-$2',
  marginBottom: '$2',
  marginLeft: '-$2',
})
