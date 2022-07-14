import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { FormattedMessage, useIntl } from 'react-intl'
import { IconButton } from '~components/Primitives/IconButton'
import { RowButton } from '~components/Primitives/RowButton'
import { styled } from '~styles'

export function KeyboardShortcutDialog() {
  const intl = useIntl()

  const shortcuts = {
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
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <RowButton id="TD-HelpItem-Keyboard">
          <FormattedMessage id="keyboard.shortcuts" />
        </RowButton>
      </Dialog.Trigger>
      <Dialog.Portal>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>
            <FormattedMessage id="keyboard.shortcuts" />
          </DialogTitle>
          <Content>
            {Object.entries(shortcuts).map(([key, value]) => (
              <div>
                <Label>{key}</Label>
                <ContentItem>
                  {value.map((shortcut) => (
                    <RowButton key={shortcut.label} kbd={shortcut.kbd} variant="wide">
                      {shortcut.label}
                    </RowButton>
                  ))}
                </ContentItem>
              </div>
            ))}
          </Content>
          <Dialog.Close asChild>
            <DialogIconButton>
              <Cross2Icon />
            </DialogIconButton>
          </Dialog.Close>
        </DialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const Content = styled('div', {
  width: '100%',
  maxHeight: '74vh',
  overflowY: 'auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 20,
})

const Label = styled('h3', {
  fontSize: '$2',
  color: '$text',
  fontFamily: '$ui',
})

const ContentItem = styled('div', {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  height: 'min-content',
  gap: 4,
  '&> button > div': {
    paddingLeft: 0,
  },
})

const DialogContent = styled(Dialog.Content, {
  backgroundColor: 'white',
  borderRadius: 6,
  boxShadow: 'hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px',
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90vw',
  maxWidth: '900px',
  minHeight: '85vh',
  maxHeight: '85vh',
  padding: 25,
  '&:focus': { outline: 'none' },
})

const DialogOverlay = styled(Dialog.Overlay, {
  backgroundColor: '$overlay',
  position: 'fixed',
  inset: 0,
})

const DialogIconButton = styled(IconButton, {
  all: 'unset',
  fontFamily: 'inherit',
  borderRadius: '100%',
  height: 25,
  width: 25,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '$text',
  position: 'absolute',
  top: 36,
  right: 26,
  cursor: 'pointer',
  '&:hover': { backgroundColor: '$hover' },
})

const DialogTitle = styled(Dialog.Title, {
  fontFamily: '$body',
  fontSize: '$3',
  color: '$text',
})
