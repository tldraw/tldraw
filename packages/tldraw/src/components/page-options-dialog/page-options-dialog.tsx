import * as React from 'react'
import * as Dialog from '@radix-ui/react-alert-dialog'
import { MixerVerticalIcon } from '@radix-ui/react-icons'
import {
  breakpoints,
  IconButton,
  DialogOverlay,
  DialogContent,
  RowButton,
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
      requestAnimationFrame(() => {
        rInput.current?.focus()
        rInput.current?.select()
      })
    }
  }, [isOpen])

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Trigger as={IconButton} bp={breakpoints} size="small" data-shy="true">
        <MixerVerticalIcon />
      </Dialog.Trigger>
      <Dialog.Overlay as={DialogOverlay} />
      <Dialog.Content as={DialogContent} onKeyDown={stopPropagation} onKeyUp={stopPropagation}>
        <Dialog.Action as={RowButton} bp={breakpoints} onClick={handleRename}>
          Rename
        </Dialog.Action>
        <Dialog.Action as={RowButton} bp={breakpoints} onClick={handleDuplicate}>
          Duplicate
        </Dialog.Action>
        <Dialog.Action
          as={RowButton}
          bp={breakpoints}
          disabled={!canDelete}
          onClick={handleDelete}
          warn={true}
        >
          Delete
        </Dialog.Action>
        <Divider />
        <Dialog.Cancel as={RowButton} bp={breakpoints}>
          Cancel
        </Dialog.Cancel>
      </Dialog.Content>
    </Dialog.Root>
  )
}
