import * as React from 'react'
import * as Dialog from '@radix-ui/react-alert-dialog'
import { MixerVerticalIcon } from '@radix-ui/react-icons'
import type { TDSnapshot, TDPage } from '~types'
import { useTldrawApp } from '~hooks'
import { RowButton, RowButtonProps } from '~components/RowButton'
import { styled } from '~styles'
import { Divider } from '~components/Divider'
import { IconButton } from '~components/IconButton/IconButton'
import { SmallIcon } from '~components/SmallIcon'
import { breakpoints } from '~components/breakpoints'

const canDeleteSelector = (s: TDSnapshot) => {
  return Object.keys(s.document.pages).length > 1
}

interface PageOptionsDialogProps {
  page: TDPage
  onOpen?: () => void
  onClose?: () => void
}

export function PageOptionsDialog({ page, onOpen, onClose }: PageOptionsDialogProps): JSX.Element {
  const app = useTldrawApp()

  const [isOpen, setIsOpen] = React.useState(false)

  const canDelete = app.useStore(canDeleteSelector)

  const rInput = React.useRef<HTMLInputElement>(null)

  const handleDuplicate = React.useCallback(() => {
    app.duplicatePage(page.id)
    onClose?.()
  }, [app])

  const handleDelete = React.useCallback(() => {
    if (window.confirm(`Are you sure you want to delete this page?`)) {
      app.deletePage(page.id)
      onClose?.()
    }
  }, [app])

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setIsOpen(isOpen)

      if (isOpen) {
        onOpen?.()
        return
      }
    },
    [app]
  )

  function stopPropagation(e: React.KeyboardEvent<HTMLDivElement>) {
    e.stopPropagation()
  }

  // TODO: Replace with text input
  function handleRename() {
    const nextName = window.prompt('New name:', page.name)
    app.renamePage(page.id, nextName || page.name || 'Page')
  }

  React.useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        const elm = rInput.current
        if (elm) {
          elm.focus()
          elm.select()
        }
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
      <StyledDialogContent dir="ltr" onKeyDown={stopPropagation} onKeyUp={stopPropagation}>
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
  width: '100%',
  height: '100%',
})

function DialogAction({ ...rest }: RowButtonProps & { onSelect: (e: Event) => void }) {
  return (
    <Dialog.Action asChild>
      <RowButton {...rest} />
    </Dialog.Action>
  )
}
