import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as React from 'react'
import { styled } from '~styles'

interface ContentProps {
  children: React.ReactNode
  onClose?: () => void
  container: any
}

function Content({ children, onClose, container }: ContentProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        onClose?.()
        break
    }
  }
  return (
    <AlertDialogPrimitive.Portal container={container}>
      <StyledOverlay />
      <StyledContent onKeyDown={handleKeyDown}>{children}</StyledContent>
    </AlertDialogPrimitive.Portal>
  )
}

const StyledDescription = styled(AlertDialogPrimitive.Description, {
  marginBottom: 20,
  color: '$text',
  fontSize: '$2',
  lineHeight: 1.5,
  textAlign: 'center',
  minWidth: 0,
  alignSelf: 'center',
  maxWidth: '62%',
})

const AlertDialogRoot = AlertDialogPrimitive.Root
const AlertDialogContent = Content
const AlertDialogDescription = StyledDescription
const AlertDialogAction = AlertDialogPrimitive.Action

interface AlertProps {
  container: any
  description: string
  open: boolean
  onClose: () => void
}

export const Alert = ({ container, description, open, onClose }: AlertProps) => {
  return (
    <AlertDialogRoot open={open}>
      <AlertDialogContent onClose={onClose} container={container}>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: 'auto',
          }}
        >
          <AlertDialogAction asChild>
            <Button css={{ backgroundColor: '#2F80ED', color: 'White' }} onClick={onClose}>
              Ok
            </Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogRoot>
  )
}

const StyledOverlay = styled(AlertDialogPrimitive.Overlay, {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, .15)',
  pointerEvents: 'all',
})

const StyledContent = styled(AlertDialogPrimitive.Content, {
  position: 'fixed',
  font: '$ui',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'max-content',
  padding: '$3',
  pointerEvents: 'all',
  backgroundColor: '$panel',
  borderRadius: '$3',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  fontFamily: '$ui',
  border: '1px solid $panelContrast',
  boxShadow: '$panel',
})

const Button = styled('button', {
  all: 'unset',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$2',
  padding: '0 15px',
  fontSize: '$1',
  lineHeight: 1,
  fontWeight: 'normal',
  height: 36,
  color: '$text',
  cursor: 'pointer',
  minWidth: 48,
  width: 'max-content',
})
