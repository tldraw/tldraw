import * as Dialog from '@radix-ui/react-alert-dialog'
import * as React from 'react'
import { FormattedMessage } from 'react-intl'
import { useContainer, useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { StyledDialogContent, StyledDialogOverlay } from '../PageOptionsDialog'

const exportTypes = ['svg', 'png', 'jpg', 'wepb']

export function ExportPagesDialog() {
  const app = useTldrawApp()
  const [selectedPages, setSelectedPages] = React.useState<string[]>([
    ...Object.keys(app.document.pages),
  ])
  const container = useContainer()

  const handleSelectPage = React.useCallback(
    (id: string) => {
      if (selectedPages.includes(id)) {
        setSelectedPages((prev) => prev.filter((prevId) => prevId !== id))
      }
      setSelectedPages([...selectedPages, id])
    },
    [selectedPages]
  )

  const isSelected = (id: string) => selectedPages.includes(id)

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild data-shy="true">
        <TriggerLabel>All pages</TriggerLabel>
      </Dialog.Trigger>
      <Dialog.Portal container={container.current}>
        <StyledDialogOverlay />
        <StyledDialogContent css={{ padding: 12 }} dir="ltr">
          <Title>Export</Title>
          <PageList>
            {Object.keys(app.document.pages).map((page) => (
              <ListItem key={page}>
                <input type="checkbox" checked={isSelected(page)} />
                <Label>{app.document.pages[page].name}</Label>
              </ListItem>
            ))}
          </PageList>
          <ExportButton>
            <FormattedMessage id="export" />
            <Select>
              {exportTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </ExportButton>
        </StyledDialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const TriggerLabel = styled('h3', {
  fontSize: '$1',
  color: '$text',
  fontFamily: '$ui',
  padding: '0 8px',
  cursor: 'pointer',
})

const PageList = styled('ul', {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  listStyleType: 'none',
  marginTop: 20,
  padding: 0,
})

const ListItem = styled('li', {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 'max-content',
})

const Label = styled('h4', {
  fontSize: '$1',
  color: '$text',
  fontFamily: '$body',
  margin: 2,
})

const Title = styled('h2', {
  fontSize: '$2',
  fontFamily: '$ui',
  color: '$text',
})

const Select = styled('select', {
  background: 'inherit',
  color: '$text',
  fontSize: '$1',
  fontFamily: '$ui',
  border: 'none',
})

const ExportButton = styled('button', {
  fontSize: '$1',
  color: '$text',
  fontFamily: '$ui',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#2696FF',
  gap: 8,
  border: 'none',
  padding: '4px 12px',
  height: 40,
  borderRadius: 6,
  width: '100%',
})
