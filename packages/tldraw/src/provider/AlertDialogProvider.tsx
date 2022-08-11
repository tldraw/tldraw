import * as React from 'react'
import { AlertDialog } from '~components/Primitives/AlertDialog'
import { AlertDialogContext } from '~hooks'

export const AlertDialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [hasAccepted, setHasAccepted] = React.useState(false)
  const [content, setContent] = React.useState('This cannot be undone')

  const onClose = React.useCallback(() => {
    setHasAccepted(false)
    setIsOpen(!isOpen)
  }, [])

  const onAccept = React.useCallback(() => {
    setHasAccepted(true)
    setIsOpen(false)
    setTimeout(() => setHasAccepted(false), 500)
  }, [])

  const onOpen = React.useCallback((text: string) => {
    setIsOpen(true)
    setContent((prev) => text ?? prev)
  }, [])

  return (
    <AlertDialogContext.Provider value={{ onOpen, onAccept, onClose, hasAccepted }}>
      <AlertDialog content={content} open={isOpen} onClose={onClose} onAccept={onAccept} />
      {children}
    </AlertDialogContext.Provider>
  )
}
