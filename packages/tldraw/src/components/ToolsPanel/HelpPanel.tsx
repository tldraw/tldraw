import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { useIntl } from 'react-intl'
import { styled } from '~styles'
import { useTldrawApp } from '~hooks'
import { TDSnapshot } from '~types'
import { breakpoints } from '~components/breakpoints'
import { QuestionMarkIcon } from '@radix-ui/react-icons'
import { RowButton } from '~components/Primitives/RowButton'
import { MenuContent } from '~components/Primitives/MenuContent'
import { DMDivider } from '~components/Primitives/DropdownMenu'

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
    '---',
    { label: intl.formatMessage({ id: 'undo' }), kbd: '#Z' },
    { label: intl.formatMessage({ id: 'redo' }), kbd: '#⇧Z' },
    { label: intl.formatMessage({ id: 'cut' }), kbd: '#X' },
    { label: intl.formatMessage({ id: 'copy' }), kbd: '#C' },
    { label: intl.formatMessage({ id: 'paste' }), kbd: '#V' },
    { label: intl.formatMessage({ id: 'select.all' }), kbd: '#A' },
    { label: intl.formatMessage({ id: 'delete' }), kbd: '⌫' },
    '---',
    { label: intl.formatMessage({ id: 'zoom.in' }), kbd: '#+' },
    { label: intl.formatMessage({ id: 'zoom.out' }), kbd: '#-' },
    { label: `${intl.formatMessage({ id: 'zoom.to' })} 100%`, kbd: '⇧+0' },
    { label: intl.formatMessage({ id: 'zoom.to.fit' }), kbd: '⇧+1' },
    { label: intl.formatMessage({ id: 'zoom.to.selection' }), kbd: '⇧+2' },
    '---',
    { label: intl.formatMessage({ id: 'preferences.dark.mode' }), kbd: '#⇧D' },
    { label: intl.formatMessage({ id: 'preferences.focus.mode' }), kbd: '#.' },
    { label: intl.formatMessage({ id: 'preferences.show.grid' }), kbd: '#⇧G' },
    '---',
    { label: intl.formatMessage({ id: 'duplicate' }), kbd: '#D' },
    { label: intl.formatMessage({ id: 'flip.horizontal' }), kbd: '⇧H' },
    { label: intl.formatMessage({ id: 'flip.vertical' }), kbd: '⇧V' },
    {
      label: `${intl.formatMessage({ id: 'lock' })} / ${intl.formatMessage({ id: 'unlock' })}`,
      kbd: '#⇧L',
    },
    '---',
    {
      label: `${intl.formatMessage({ id: 'move' })} ${intl.formatMessage({ id: 'to.front' })}`,
      kbd: '⇧]',
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
    <Popover.Root modal={false}>
      <PopoverAnchor dir="ltr">
        <Popover.Trigger asChild dir="ltr">
          <HelpButton side={side} debug={isDebugMode} bp={breakpoints}>
            <QuestionMarkIcon />
          </HelpButton>
        </Popover.Trigger>
      </PopoverAnchor>
      <Popover.Content asChild dir="ltr">
        <StyledContent>
          {shortcuts.map((shortcut, i) =>
            typeof shortcut === 'string' ? (
              <DMDivider key={i} />
            ) : (
              <RowButton key={shortcut.label} kbd={shortcut.kbd} variant="wide">
                {shortcut.label}
              </RowButton>
            )
          )}
        </StyledContent>
      </Popover.Content>
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
