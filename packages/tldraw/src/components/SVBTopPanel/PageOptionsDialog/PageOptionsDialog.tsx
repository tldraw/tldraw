import * as Dialog from '@radix-ui/react-alert-dialog'
import { MixerVerticalIcon, Pencil1Icon } from '@radix-ui/react-icons'
import * as React from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Divider } from '~components/Primitives/Divider'
import { IconButton } from '~components/Primitives/IconButton/IconButton'
import { RowButton, RowButtonProps } from '~components/Primitives/RowButton'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { TextField } from '~components/Primitives/TextField'
import { breakpoints } from '~components/breakpoints'
import { useContainer, useTldrawApp } from '~hooks'
import { styled } from '~styles'
import type { TDPage, TDSnapshot } from '~types'

const canDeleteSelector = (s: TDSnapshot) => {
  return Object.keys(s.document.pages).length > 1
}

interface PageOptionsDialogProps {
  page: TDPage
  onOpen?: () => void
  onClose?: () => void
}

export function PageOptionsDialog({ page, onOpen, onClose }: PageOptionsDialogProps) {
  const app = useTldrawApp()
  const intl = useIntl()

  const [isOpen, setIsOpen] = React.useState(false)
  const [pageName, setPageName] = React.useState(page.name || 'Page')

  const canDelete = app.useStore(canDeleteSelector)

  const rInput = React.useRef<HTMLInputElement>(null)

  const handleClose = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleDuplicate = React.useCallback(() => {
    app.duplicatePage(page.id)
  }, [app])

  const handleDelete = React.useCallback(() => {
    if (window.confirm(`Are you sure you want to delete this page?`)) {
      app.deletePage(page.id)
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

  const rInitialName = React.useRef(page.name || 'Page')
  const rCurrentName = React.useRef(rInitialName.current)

  const handleTextFieldChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trimStart()
    rCurrentName.current = value
    setPageName(value)
  }, [])

  const handleTextFieldKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter': {
        if (rCurrentName.current === rInitialName.current) {
          setIsOpen(false)
        } else {
          rInitialName.current = rCurrentName.current
          app.renamePage(page.id, rCurrentName.current.trim())
          setIsOpen(false)
        }

        break
      }
      case 'Escape': {
        // If the name hasn't changed, close the menu
        if (rCurrentName.current === rInitialName.current) {
          setIsOpen(false)
          return
        }

        // If the name has changed, revert the change
        rCurrentName.current = rInitialName.current
        setPageName(rInitialName.current)

        // ...and refocus the input
        requestAnimationFrame(() => {
          const elm = rInput.current
          if (elm) {
            elm.focus()
            elm.setSelectionRange(0, elm.value.length)
          }
        })
        break
      }
    }
  }, [])

  const rWasOpen = React.useRef(false)

  React.useEffect(() => {
    if (isOpen) {
      rWasOpen.current = true
      rInitialName.current = page.name || 'Page'
      rCurrentName.current = rInitialName.current

      requestAnimationFrame(() => {
        const elm = rInput.current
        if (elm) {
          elm.focus()
          elm.setSelectionRange(0, elm.value.length)
        }
      })
    } else if (rWasOpen.current) {
      onClose?.()
    }

    return () => {
      if (rCurrentName.current !== rInitialName.current) {
        rInitialName.current = rCurrentName.current
        app.renamePage(page.id, rCurrentName.current)
      }
    }
  }, [isOpen])

  const container = useContainer()

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild data-shy="true">
        <IconButton bp={breakpoints}>
          <SmallIcon>
            <MixerVerticalIcon />
          </SmallIcon>
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Portal container={container.current}>
        <StyledDialogOverlay onPointerDown={handleClose} />
        <StyledDialogContent dir="ltr" onKeyDown={stopPropagation} onKeyUp={stopPropagation}>
          <TextField
            ref={rInput}
            placeholder={intl.formatMessage({ id: 'page.name' })}
            value={pageName}
            onChange={handleTextFieldChange}
            onKeyDown={handleTextFieldKeyDown}
            icon={<Pencil1Icon />}
          />
          <Divider />
          <DialogAction onSelect={handleDuplicate}>
            <FormattedMessage id="duplicate" />
          </DialogAction>
          <DialogAction disabled={!canDelete} onSelect={handleDelete}>
            <FormattedMessage id="delete" />
          </DialogAction>
          <Divider />
          <Dialog.Cancel asChild>
            <RowButton>
              <FormattedMessage id="cancel" />
            </RowButton>
          </Dialog.Cancel>
        </StyledDialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* -------------------------------------------------- */
/*                       Dialog                       */
/* -------------------------------------------------- */

export const StyledDialogContent = styled(Dialog.Content, {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  minWidth: 240,
  maxWidth: 'fit-content',
  maxHeight: '85vh',
  marginTop: '-5vh',
  pointerEvents: 'all',
  backgroundColor: '$panel',
  padding: '$1',
  borderRadius: '$2',
  font: '$ui',
  zIndex: 999999,
  '&:focus': {
    outline: 'none',
  },
})

export const StyledDialogOverlay = styled(Dialog.Overlay, {
  backgroundColor: 'rgba(0, 0, 0, .15)',
  position: 'absolute',
  pointerEvents: 'all',
  inset: 0,
  zIndex: 999998,
})

function DialogAction({
  onSelect,
  ...rest
}: RowButtonProps & { onSelect: (e: React.SyntheticEvent<HTMLButtonElement, Event>) => void }) {
  return (
    <Dialog.Action asChild onClick={onSelect} onSelect={onSelect}>
      <RowButton {...rest} />
    </Dialog.Action>
  )
}
