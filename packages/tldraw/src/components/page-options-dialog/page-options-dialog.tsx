import * as React from 'react'
import * as Dialog from '@radix-ui/react-alert-dialog'
import { MixerVerticalIcon } from '@radix-ui/react-icons'
import {
  breakpoints,
  IconButton,
  DialogOverlay,
  DialogContent,
  RowButton,
  MenuTextInput,
  DialogInputWrapper,
  Divider,
} from '~components/shared'
import type { Data, TLDrawPage } from '~types'
import { useTLDrawContext } from '~hooks'

const canDeleteSelector = (s: Data) => {
  // TODO: Include all pages
  return [s.page].length <= 1
}

export function PageOptionsDialog({ page }: { page: TLDrawPage }): JSX.Element {
  const { tlstate, useSelector } = useTLDrawContext()

  const [isOpen, setIsOpen] = React.useState(false)

  const canDelete = useSelector(canDeleteSelector)

  const rInput = React.useRef<HTMLInputElement>(null)

  const [name, setName] = React.useState(page.name || 'Page')

  const handleNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.currentTarget.value)
  }, [])

  const handleDuplicate = React.useCallback(() => {
    tlstate.duplicatePage(page.id)
  }, [tlstate])

  const handleDelete = React.useCallback(() => {
    tlstate.deletePage(page.id)
  }, [tlstate])

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setIsOpen(isOpen)

      if (isOpen) {
        return
      }

      if (name.length === 0) {
        tlstate.renamePage(page.id, 'Page')
      }
    },
    [tlstate, name]
  )

  const handleSave = React.useCallback(() => {
    tlstate.renamePage(page.id, name)
  }, [tlstate, name])

  function stopPropagation(e: React.KeyboardEvent<HTMLDivElement>) {
    e.stopPropagation()
  }

  function handleKeydown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter') {
      handleSave()
      setIsOpen(false)
    }
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
      <Dialog.Trigger as={IconButton} bp={breakpoints} size="small" data-shy="true">
        <MixerVerticalIcon />
      </Dialog.Trigger>
      <Dialog.Overlay as={DialogOverlay} />
      <Dialog.Content as={DialogContent} onKeyDown={stopPropagation} onKeyUp={stopPropagation}>
        <DialogInputWrapper>
          <MenuTextInput
            ref={rInput}
            value={name}
            onChange={handleNameChange}
            onKeyDown={handleKeydown}
          />
        </DialogInputWrapper>
        <Divider />
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
        <Dialog.Action as={RowButton} bp={breakpoints} onClick={handleSave}>
          Save
        </Dialog.Action>
        <Dialog.Cancel as={RowButton} bp={breakpoints}>
          Cancel
        </Dialog.Cancel>
      </Dialog.Content>
    </Dialog.Root>
  )
}
