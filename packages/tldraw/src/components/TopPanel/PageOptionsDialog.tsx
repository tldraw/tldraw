import * as React from 'react'
import * as Dialog from '@radix-ui/react-alert-dialog'
import { MixerVerticalIcon } from '@radix-ui/react-icons'
import type { Data, TLDrawPage } from '~types'
import { useTLDrawContext } from '~hooks'
import { RowButton, RowButtonProps } from '~components/RowButton'
import styled from '~styles'
import { Divider } from '~components/Divider'
import { IconButton } from '~components/IconButton/IconButton'
import { SmallIcon } from '~components/SmallIcon'
import { breakpoints } from '~components/breakpoints'

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
      <Dialog.Trigger asChild data-shy="true">
        <IconButton bp={breakpoints}>
          <SmallIcon>
            <MixerVerticalIcon />
          </SmallIcon>
        </IconButton>
      </Dialog.Trigger>
      <StyledDialogOverlay />
      <StyledDialogContent onKeyDown={stopPropagation} onKeyUp={stopPropagation}>
        <DialogAction onSelect={handleRename}>Rename</DialogAction>
        <DialogAction onSelect={handleDuplicate}>Duplicate</DialogAction>
        <DialogAction disabled={!canDelete} onSelect={handleDelete}>
          Delete
        </DialogAction>
        <Divider />
        <Dialog.Cancel asChild>
          <RowButton>Cancel</RowButton>
        </Dialog.Cancel>
      </StyledDialogContent>
    </Dialog.Root>
  )
}

/* -------------------------------------------------- */
/*                       Dialog                       */
/* -------------------------------------------------- */

export const StyledDialogContent = styled(Dialog.Content, {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  minWidth: 240,
  maxWidth: 'fit-content',
  maxHeight: '85vh',
  marginTop: '-5vh',
  pointerEvents: 'all',
  backgroundColor: '$panel',
  border: '1px solid $panelBorder',
  padding: '$0',
  borderRadius: '$2',
  font: '$ui',
  '&:focus': {
    outline: 'none',
  },
})

export const StyledDialogOverlay = styled(Dialog.Overlay, {
  backgroundColor: 'rgba(0, 0, 0, .15)',
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
})

function DialogAction({ onSelect, ...rest }: RowButtonProps) {
  return (
    <Dialog.Action asChild onClick={onSelect}>
      <RowButton {...rest} />
    </Dialog.Action>
  )
}
