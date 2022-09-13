import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import * as React from 'react'
import { FormattedMessage } from 'react-intl'
import { IconButton } from '~components/Primitives/IconButton'
import { DialogContent } from '~components/ToolsPanel/KeyboardShortcutDialog'
import { useContainer, useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { TDExportType } from '~types'

const exportTypes = [TDExportType.JPG, TDExportType.PNG, TDExportType.SVG, TDExportType.WEBP]

export function ExportPagesDialog() {
  const app = useTldrawApp()
  const [selectedPages, setSelectedPages] = React.useState<string[]>([
    ...Object.keys(app.document.pages),
  ])
  const [exportType, setExportType] = React.useState<string>(TDExportType.PNG)
  const container = useContainer()

  const handleSelectPage = React.useCallback(
    (id: string) => {
      if (selectedPages.includes(id)) {
        setSelectedPages(selectedPages.filter((prevId) => prevId !== id))
      } else {
        setSelectedPages([...selectedPages, id])
      }
    },
    [selectedPages, setSelectedPages]
  )

  const isSelected = React.useCallback((id: string) => selectedPages.includes(id), [selectedPages])

  const handleExportPages = React.useCallback(async () => {
    for (const page of selectedPages) {
      await app.exportImage(exportType as any, { scale: 2, quality: 1, pageId: page })
    }
  }, [exportType, selectedPages])

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild data-shy="true">
        <TriggerLabel>All pages</TriggerLabel>
      </Dialog.Trigger>
      <Dialog.Portal container={container.current}>
        <DialogOverlay />
        <StyledContent css={{ padding: 12 }} dir="ltr">
          <DialogTitle>
            <FormattedMessage id="export" />
            <Dialog.Close asChild>
              <DialogIconButton>
                <Cross2Icon />
              </DialogIconButton>
            </Dialog.Close>
          </DialogTitle>
          <PageList>
            {Object.keys(app.document.pages).map((page) => (
              <ListItem key={page}>
                <input
                  type="checkbox"
                  checked={isSelected(page)}
                  onChange={() => handleSelectPage(page)}
                />
                <Label>{app.document.pages[page].name}</Label>
              </ListItem>
            ))}
          </PageList>
          <StyledFooter>
            <Select
              onChange={(e) => {
                setExportType(e.target.value as TDExportType)
              }}
              defaultValue={exportType}
            >
              {exportTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <ExportButton disabled={selectedPages.length === 0} onClick={handleExportPages}>
              <FormattedMessage id="export" />
            </ExportButton>
          </StyledFooter>
        </StyledContent>
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
const DialogTitle = styled(Dialog.Title, {
  fontFamily: '$body',
  fontSize: '$3',
  color: '$text',
  paddingBottom: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: 0,
})

const Select = styled('select', {
  background: 'inherit',
  color: '$text',
  fontSize: '$1',
  fontFamily: '$ui',
  border: 'none',
})

const StyledFooter = styled('div', {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
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
  cursor: 'pointer',
})

const DialogIconButton = styled(IconButton, {
  fontFamily: 'inherit',
  borderRadius: '100%',
  height: 25,
  width: 25,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '$text',
  cursor: 'pointer',
  '&:hover': { backgroundColor: '$hover' },
})

const DialogOverlay = styled(Dialog.Overlay, {
  backgroundColor: '$overlay',
  position: 'fixed',
  inset: 0,
  zIndex: 9998,
})

const StyledContent = styled(DialogContent, {
  minWidth: '300px',
})
