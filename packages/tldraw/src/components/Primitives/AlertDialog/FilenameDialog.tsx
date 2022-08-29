import * as Dialog from '@radix-ui/react-alert-dialog'
import { Pencil1Icon } from '@radix-ui/react-icons'
import * as React from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { useContainer, useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { TextField } from '../TextField'
import { Button } from './AlertDialog'

interface FilenameDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const FilenameDialog = ({ isOpen, onClose }: FilenameDialogProps) => {
  const app = useTldrawApp()
  const container = useContainer()
  const intl = useIntl()
  const [filename, setFilename] = React.useState('')

  const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trimStart()
    setFilename(value)
  }, [])

  function stopPropagation(e: React.KeyboardEvent<HTMLDivElement>) {
    e.stopPropagation()
  }

  const handleTextFieldKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter': {
        app.saveProjectAs(filename)
        onClose()
        break
      }
      case 'Escape': {
        onClose()
        break
      }
    }
  }, [])

  return (
    <Dialog.Root open={isOpen}>
      <Dialog.Portal container={container.current}>
        <StyledDialogOverlay onPointerDown={onClose} />
        <StyledDialogContent dir="ltr" onKeyDown={stopPropagation} onKeyUp={stopPropagation}>
          <Input
            placeholder={intl.formatMessage({ id: 'enter.file.name' })}
            value={filename}
            onChange={handleChange}
            onKeyDown={handleTextFieldKeyDown}
            icon={<Pencil1Icon />}
          />
          <ActionWrapper>
            <Dialog.Action asChild>
              <Button onClick={onClose}>
                <FormattedMessage id="cancel" />
              </Button>
            </Dialog.Action>
            <Dialog.Action asChild>
              <Button
                css={{ backgroundColor: '#2F80ED', color: 'White' }}
                onClick={() => {
                  app.saveProjectAs(filename)
                  onClose()
                }}
              >
                <FormattedMessage id="save" />
              </Button>
            </Dialog.Action>
          </ActionWrapper>
        </StyledDialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
const StyledDialogContent = styled(Dialog.Content, {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  minWidth: 300,
  maxWidth: 'fit-content',
  maxHeight: '85vh',
  marginTop: '-5vh',
  pointerEvents: 'all',
  backgroundColor: '$panel',
  padding: '$3',
  borderRadius: '$2',
  font: '$ui',
  zIndex: 999999,
  '&:focus': {
    outline: 'none',
  },
})

const StyledDialogOverlay = styled(Dialog.Overlay, {
  backgroundColor: 'rgba(0, 0, 0, .15)',
  position: 'absolute',
  pointerEvents: 'all',
  inset: 0,
  zIndex: 999998,
})

const ActionWrapper = styled('div', {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  justifyContent: 'flex-end',
  marginTop: 10,
})

const Input = styled(TextField, {
  background: '$hover',
})
