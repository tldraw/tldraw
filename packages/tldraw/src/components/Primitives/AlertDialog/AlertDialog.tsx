import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as React from 'react'
import { styled } from '~styles'

interface ContentProps {
  children: React.ReactNode
  onClose?: () => void
}
interface AlertDialogProps {
  open: boolean
  onClose?: () => void
  onAccept: () => void
  content: string
}

function Content({ children, onClose }: ContentProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        onClose?.()
        break
    }
  }
  return (
    <AlertDialogPrimitive.Portal>
      <StyledOverlay />
      <StyledContent>{children}</StyledContent>
    </AlertDialogPrimitive.Portal>
  )
}

const StyledTitle = styled(AlertDialogPrimitive.Title, {
  margin: 0,
  color: '$text',
  fontSize: '$3',
  fontWeight: 500,
})

const StyledDescription = styled(AlertDialogPrimitive.Description, {
  marginBottom: 20,
  color: '$text',
  fontSize: '$2',
  lineHeight: 1.5,
})

export const AlertDialogRoot = AlertDialogPrimitive.Root
export const AlertDialogContent = Content
export const AlertDialogTitle = StyledTitle
export const AlertDialogDescription = StyledDescription
export const AlertDialogAction = AlertDialogPrimitive.Action
export const AlertDialogCancel = AlertDialogPrimitive.Cancel

export const AlertDialog = ({ open, onClose, content, onAccept }: AlertDialogProps) => {
  console.log({ open })

  return (
    <AlertDialogRoot open={open}>
      <AlertDialogContent onClose={onClose}>
        <AlertDialogTitle>Are you sure to continue?</AlertDialogTitle>
        <AlertDialogDescription>{content}</AlertDialogDescription>
        <Flex css={{ justifyContent: 'flex-end' }}>
          <AlertDialogCancel asChild>
            <Button css={{ marginRight: 10 }} onClick={onClose}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button css={{ backgroundColor: '#2F80ED', color: 'White' }} onClick={onAccept}>
              Yes, continue
            </Button>
          </AlertDialogAction>
        </Flex>
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

export const StyledDialogOverlay = styled(AlertDialogPrimitive.Overlay, {
  backgroundColor: 'rgba(0, 0, 0, .15)',
  position: 'absolute',
  pointerEvents: 'all',
  inset: 0,
})

const StyledContent = styled(AlertDialogPrimitive.Content, {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90vw',
  maxWidth: 'fit-content',
  minWidth: '400px',
  maxHeight: '85vh',
  pointerEvents: 'all',
  backgroundColor: '$panel',
  padding: '$4',
  borderRadius: '$2',
  font: '$ui',
})

const Flex = styled('div', { display: 'flex' })

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
  // font: '$ui',
})
