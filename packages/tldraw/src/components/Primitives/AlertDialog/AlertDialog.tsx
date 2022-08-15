import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as React from 'react'
import { DialogState, useDialog } from '~hooks'
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
})

export const AlertDialogRoot = AlertDialogPrimitive.Root
export const AlertDialogContent = Content
export const AlertDialogDescription = StyledDescription
export const AlertDialogAction = AlertDialogPrimitive.Action
export const AlertDialogCancel = AlertDialogPrimitive.Cancel

const descriptions: Record<DialogState, string> = {
  saveFirstTime: 'Do you want to save your current project?',
  saveAgain: 'Do you want to save changes to your current project?',
  createNew: 'Do you want to create a new project?',
}

export const AlertDialog = ({ container }: { container: any }) => {
  const { setDialogState, dialogState, onCancel, onNo, onYes } = useDialog()

  return (
    <AlertDialogRoot open={dialogState !== null}>
      <AlertDialogContent onClose={() => setDialogState(null)} container={container}>
        {dialogState && (
          <AlertDialogDescription>{descriptions[dialogState]}</AlertDialogDescription>
        )}
        <Flex css={{ justifyContent: 'space-between' }}>
          {onCancel && (
            <AlertDialogCancel asChild>
              <Button
                css={{ color: '$text' }}
                onClick={() => {
                  onCancel()
                  setDialogState(null)
                }}
              >
                Cancel
              </Button>
            </AlertDialogCancel>
          )}
          <Flex css={{ justifyContent: 'flex-end' }}>
            {onNo && (
              <AlertDialogAction asChild>
                <Button
                  onClick={() => {
                    onNo()
                    setDialogState(null)
                  }}
                >
                  No
                </Button>
              </AlertDialogAction>
            )}
            {onYes && (
              <AlertDialogAction asChild>
                <Button
                  css={{ backgroundColor: '#2F80ED', color: 'White' }}
                  onClick={() => {
                    onYes()
                    setDialogState(null)
                  }}
                >
                  Yes
                </Button>
              </AlertDialogAction>
            )}
          </Flex>
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
  font: '$ui',
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
  fontFamily: '$ui',
  border: '1px solid $panelContrast',
  boxShadow: '$panel',
})

const Flex = styled('div', { display: 'flex', gap: '$4' })

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
})
