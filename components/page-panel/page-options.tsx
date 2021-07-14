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
} from 'components/shared'
import { useState } from 'react'
import state, { useSelector } from 'state'
import { Page } from 'types'

export default function PageOptions({ page }: { page: Page }): JSX.Element {
  const hasOnlyOnePage = useSelector(
    (s) => Object.keys(s.data.document.pages).length <= 1
  )

  const [name, setName] = useState(page.name)

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.currentTarget.value)
  }

  function handleDuplicate() {
    state.send('DUPLICATED_PAGE', { id: page.id })
  }

  function handleDelete() {
    state.send('DELETED_PAGE', { id: page.id })
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) return

    if (page.name.length === 0) {
      state.send('RENAMED_PAGE', {
        id: page.id,
        name: 'Page',
      })
    }

    state.send('SAVED_PAGE_RENAME', { id: page.id })
  }

  function handleSave() {
    state.send('RENAMED_PAGE', {
      id: page.id,
      name,
    })
  }

  function stopPropagation(e: React.KeyboardEvent<HTMLDivElement>) {
    e.stopPropagation()
  }

  return (
    <Dialog.Root onOpenChange={handleOpenChange}>
      <Dialog.Trigger
        as={IconButton}
        bp={breakpoints}
        size="small"
        data-shy="true"
      >
        <MixerVerticalIcon />
      </Dialog.Trigger>
      <Dialog.Overlay as={DialogOverlay} />
      <Dialog.Content
        as={DialogContent}
        onKeyPress={stopPropagation}
        onKeyDown={stopPropagation}
        onKeyUp={stopPropagation}
      >
        <DialogInputWrapper>
          <MenuTextInput value={name} onChange={handleNameChange} />
        </DialogInputWrapper>
        <Divider />
        <Dialog.Action
          as={RowButton}
          bp={breakpoints}
          onClick={handleDuplicate}
        >
          Duplicate
        </Dialog.Action>
        <Dialog.Action
          as={RowButton}
          bp={breakpoints}
          disabled={hasOnlyOnePage}
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
