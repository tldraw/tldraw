import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import { FormattedMessage, useIntl } from 'react-intl'
import { DMDivider } from '~components/Primitives/DropdownMenu'
import { IconButton } from '~components/Primitives/IconButton'
import { RowButton } from '~components/Primitives/RowButton'
import { styled } from '~styles'
import { TextField } from '~components/Primitives/TextField'

export function KeyboardShortcutDialog() {
  const intl = useIntl()
  const [searchValue, setSearchValue] = React.useState('')

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

  const filteredShortcuts = React.useMemo(() => {
    if (searchValue.length)
      return shortcuts.filter(
        shortcut =>
          typeof shortcut === 'object' && shortcut.label.toLocaleLowerCase().includes(searchValue)
      )
    return shortcuts
  }, [searchValue])

  const handleChangeValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value)
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <RowButton id="TD-HelpItem-Keyboard">
          <FormattedMessage id="keyboard.shortcuts" />
        </RowButton>
      </Dialog.Trigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>
            <FormattedMessage id="keyboard.shortcuts" />
          </DialogTitle>
          <DialogSearch
            width="100%"
            placeholder={`${intl.formatMessage({ id: 'search' })}...`}
            value={searchValue}
            onChange={handleChangeValue}
          />
          <Content>
            {filteredShortcuts.map((shortcut, i) =>
              typeof shortcut === 'string' ? (
                <DMDivider css={{ width: '100%' }} key={i} />
              ) : (
                <RowButton key={shortcut.label} kbd={shortcut.kbd} variant="wide">
                  {shortcut.label}
                </RowButton>
              )
            )}
          </Content>
          <Dialog.Close asChild>
            <DialogIconButton>
              <Cross2Icon />
            </DialogIconButton>
          </Dialog.Close>
        </DialogContent>
      </DialogPortal>
    </Dialog.Root>
  )
}

const DialogSearch = styled(TextField, {
  marginBottom: 14,
  background: '$hover',
})

const Content = styled('div', {
  width: '100%',
  maxHeight: '68vh',
  overflowY: 'auto',
})

const DialogPortal = styled(Dialog.Portal, {
  zIndex: 999999,
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
  maxWidth: '700px',
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
