import * as React from 'react'
import * as Dialog from '@radix-ui/react-alert-dialog'
import { MixerVerticalIcon } from '@radix-ui/react-icons'
import {
  breakpoints,
  iconButton,
  DialogOverlay,
  DialogContent,
  rowButton,
  Divider,
} from '~components/shared'
import type { Data, TLDrawPage } from '~types'
import { useTLDrawContext } from '~hooks'

const canDeleteSelector = (s: Data) => {
  return Object.keys(s.document.pages).length > 1
}

interface PageOptionsDialogProps {
  page: TLDrawPage
  onOpen?: () => void
  onClose?: () => void
}

export function PageOptionsDialog({ page, onOpen, onClose }: PageOptionsDialogProps): JSX.Element {
  const { tlstate, useSelector } = useTLDrawContext()

  const [isOpen, setIsOpen] = React.useState(false)

  const canDelete = useSelector(canDeleteSelector)

  const rInput = React.useRef<HTMLInputElement>(null)

  const handleDuplicate = React.useCallback(() => {
    tlstate.duplicatePage(page.id)
    onClose?.()
  }, [tlstate])

  const handleDelete = React.useCallback(() => {
    if (window.confirm(`Are you sure you want to delete this page?`)) {
      tlstate.deletePage(page.id)
      onClose?.()
    }
  }, [tlstate])

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setIsOpen(isOpen)

      if (isOpen) {
        onOpen?.()
        return
      }
    },
    [tlstate, name]
  )

  function stopPropagation(e: React.KeyboardEvent<HTMLDivElement>) {
    e.stopPropagation()
  }

  // TODO: Replace with text input
  function handleRename() {
    const nextName = window.prompt('New name:', page.name)
    tlstate.renamePage(page.id, nextName || page.name || 'Page')
  }

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        rInput.current?.focus()
        rInput.current?.select()
      }, 0)
    }
  }, [isOpen])

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Trigger className={iconButton({ bp: breakpoints, size: 'small' })} data-shy="true">
        <MixerVerticalIcon />
      </Dialog.Trigger>
      <Dialog.Overlay as={DialogOverlay} />
      <Dialog.Content as={DialogContent} onKeyDown={stopPropagation} onKeyUp={stopPropagation}>
        <Dialog.Action className={rowButton({ bp: breakpoints })} onClick={handleRename}>
          Rename
        </Dialog.Action>
        <Dialog.Action className={rowButton({ bp: breakpoints })} onClick={handleDuplicate}>
          Duplicate
        </Dialog.Action>
        <Dialog.Action
          className={rowButton({ bp: breakpoints, warn: true })}
          disabled={!canDelete}
          onClick={handleDelete}
        >
          Delete
        </Dialog.Action>
        <Divider />
        <Dialog.Cancel className={rowButton({ bp: breakpoints })}>Cancel</Dialog.Cancel>
      </Dialog.Content>
    </Dialog.Root>
  )
}
