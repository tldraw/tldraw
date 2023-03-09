import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import * as React from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { IconButton } from '~components/Primitives/IconButton'
import { Kbd } from '~components/Primitives/Kbd'
import { RowButton } from '~components/Primitives/RowButton'
import { breakpoints } from '~components/breakpoints'
import { useContainer } from '~hooks'
import { styled } from '~styles'

export function KeyboardShortcutDialog({
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void
}) {
  const intl = useIntl()
  const container = useContainer()

  const shortcuts = {
    Tools: [
      { label: intl.formatMessage({ id: 'select' }), kbd: '1' },
      { label: intl.formatMessage({ id: 'draw' }), kbd: '2' },
      { label: intl.formatMessage({ id: 'eraser' }), kbd: '3' },
      { label: intl.formatMessage({ id: 'rectangle' }), kbd: '4' },
      { label: intl.formatMessage({ id: 'ellipse' }), kbd: '5' },
      { label: intl.formatMessage({ id: 'triangle' }), kbd: '6' },
      { label: intl.formatMessage({ id: 'line' }), kbd: '7' },
      { label: intl.formatMessage({ id: 'arrow' }), kbd: '8' },
      { label: intl.formatMessage({ id: 'text' }), kbd: '9' },
      { label: intl.formatMessage({ id: 'sticky' }), kbd: '0' },
    ],
    View: [
      { label: intl.formatMessage({ id: 'zoom.in' }), kbd: '#+' },
      { label: intl.formatMessage({ id: 'zoom.out' }), kbd: '#-' },
      { label: `${intl.formatMessage({ id: 'zoom.to' })} 100%`, kbd: '⇧+0' },
      { label: intl.formatMessage({ id: 'zoom.to.fit' }), kbd: '⇧+1' },
      { label: intl.formatMessage({ id: 'zoom.to.selection' }), kbd: '⇧+2' },
      { label: intl.formatMessage({ id: 'preferences.dark.mode' }), kbd: '#⇧D' },
      { label: intl.formatMessage({ id: 'preferences.focus.mode' }), kbd: '#.' },
      { label: intl.formatMessage({ id: 'preferences.show.grid' }), kbd: '#⇧G' },
    ],
    Transform: [
      { label: intl.formatMessage({ id: 'flip.horizontal' }), kbd: '⇧H' },
      { label: intl.formatMessage({ id: 'flip.vertical' }), kbd: '⇧V' },
      {
        label: `${intl.formatMessage({ id: 'lock' })} / ${intl.formatMessage({ id: 'unlock' })}`,
        kbd: '#⇧L',
      },
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
    ],
    File: [
      { label: intl.formatMessage({ id: 'new.project' }), kbd: '#N' },
      { label: intl.formatMessage({ id: 'open' }), kbd: '#O' },
      { label: intl.formatMessage({ id: 'save' }), kbd: '#S' },
      { label: intl.formatMessage({ id: 'save.as' }), kbd: '#⇧S' },
      { label: intl.formatMessage({ id: 'upload.media' }), kbd: '#U' },
    ],
    Edit: [
      { label: intl.formatMessage({ id: 'undo' }), kbd: '#Z' },
      { label: intl.formatMessage({ id: 'redo' }), kbd: '#⇧Z' },
      { label: intl.formatMessage({ id: 'cut' }), kbd: '#X' },
      { label: intl.formatMessage({ id: 'copy' }), kbd: '#C' },
      { label: intl.formatMessage({ id: 'paste' }), kbd: '#V' },
      { label: intl.formatMessage({ id: 'select.all' }), kbd: '#A' },
      { label: intl.formatMessage({ id: 'delete' }), kbd: '⌫' },
      { label: intl.formatMessage({ id: 'duplicate' }), kbd: '#D' },
    ],
  }

  return (
    <Dialog.Root onOpenChange={onOpenChange}>
      {/* // todo: hide if no keyboard is attached */}
      <Dialog.Trigger asChild>
        <RowButton id="TD-HelpItem-Keyboard" variant="wide">
          <FormattedMessage id="keyboard.shortcuts" />
        </RowButton>
      </Dialog.Trigger>
      <Dialog.Portal container={container.current}>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>
            <FormattedMessage id="keyboard.shortcuts" />
            <Dialog.Close asChild>
              <DialogIconButton>
                <Cross2Icon />
              </DialogIconButton>
            </Dialog.Close>
          </DialogTitle>
          <StyledColumns bp={breakpoints}>
            {Object.entries(shortcuts).map(([key, value]) => (
              <StyledSection key={key}>
                <Label>
                  <FormattedMessage id={`menu.${key.toLocaleLowerCase()}`} />
                </Label>
                <ContentItem>
                  {value.map((shortcut) => (
                    <StyledItem key={shortcut.label}>
                      {shortcut.label}
                      <Kbd variant="menu">{shortcut.kbd}</Kbd>
                    </StyledItem>
                  ))}
                </ContentItem>
              </StyledSection>
            ))}
          </StyledColumns>
        </DialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const Label = styled('h3', {
  fontSize: '$2',
  color: '$text',
  fontFamily: '$ui',
  margin: 0,
  paddingBottom: '$5',
})

const StyledSection = styled('div', {
  breakInside: 'avoid',
  paddingBottom: 24,
})

const ContentItem = styled('ul', {
  listStyleType: 'none',
  width: '100%',
  padding: 0,
  margin: 0,
})

const StyledItem = styled('li', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: 32,
  minHeight: 32,
  width: '100%',
  outline: 'none',
  color: '$text',
  fontFamily: '$ui',
  fontWeight: 400,
  fontSize: '$1',
  borderRadius: 4,
  userSelect: 'none',
  WebkitUserSelect: 'none',
  margin: 0,
  padding: '0 0',
})

const DialogContent = styled(Dialog.Content, {
  borderRadius: 6,
  boxShadow: 'hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px',
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'fit-content',
  maxWidth: '90vw',
  maxHeight: '74vh',
  overflowY: 'auto',
  padding: 25,
  zIndex: 9999,
  pointerEvents: 'all',
  background: '$panel',
  '&:focus': { outline: 'none' },
})

const StyledColumns = styled('div', {
  maxWidth: '100%',
  width: 'fit-content',
  height: 'fit-content',
  overflowY: 'auto',
  columnGap: 64,
  variants: {
    bp: {
      mobile: {
        columns: 1,
        [`& ${StyledSection}`]: {
          minWidth: '0px',
        },
      },
      small: {
        columns: 2,
        [`& ${StyledSection}`]: {
          minWidth: '200px',
        },
      },
      medium: {
        columns: 3,
      },
      large: {
        columns: 3,
      },
    },
  },
})

const DialogOverlay = styled(Dialog.Overlay, {
  backgroundColor: '$overlay',
  position: 'fixed',
  inset: 0,
  zIndex: 9998,
})

const DialogIconButton = styled(IconButton, {
  fontFamily: 'inherit',
  borderRadius: '100%',
  height: 25,
  width: 25,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '$text',
  cursor: 'pointer',
  '&:hover': { backgroundColor: '$hover' },
})

const DialogTitle = styled(Dialog.Title, {
  fontFamily: '$body',
  fontSize: '$3',
  color: '$text',
  paddingBottom: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: 0,
})
