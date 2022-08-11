import * as React from 'react'

interface AlertDialogProps {
  onClose: () => void
  onAccept: () => void
  hasAccepted: boolean
  onOpen: (text: string) => void
}

export const AlertDialogContext = React.createContext<AlertDialogProps>({} as AlertDialogProps)

export const useDialog = () => {
  const context = React.useContext(AlertDialogContext)
  if (!context) throw new Error('useCtx must be inside a Provider with a value')
  return context
}
