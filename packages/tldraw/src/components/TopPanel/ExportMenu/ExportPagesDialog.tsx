import * as Dialog from '@radix-ui/react-dialog'
import { ChevronDownIcon, Cross2Icon } from '@radix-ui/react-icons'
import * as Popover from '@radix-ui/react-popover'
import * as React from 'react'
import { FormattedMessage } from 'react-intl'
import { IconButton } from '~components/Primitives/IconButton'
import { DialogContent } from '~components/ToolsPanel/KeyboardShortcutDialog'
import { useContainer, useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { TDExportBackground, TDExportType, TDSnapshot } from '~types'

const exportTypes = [TDExportType.JPG, TDExportType.PNG, TDExportType.SVG, TDExportType.WEBP]

const settingsSelector = (s: TDSnapshot) => s.settings

interface DialogProps {
  isOpen?: boolean
  onClose: () => void
}

export function ExportPagesDialog({ isOpen, onClose }: DialogProps) {
  const app = useTldrawApp()
  const settings = app.useStore(settingsSelector)
  const container = useContainer()
  const [rContainer, setRContainer] = React.useState<any>(null)
  const [selectedPages, setSelectedPages] = React.useState<string[]>([
    ...Object.keys(app.document.pages),
  ])
  const [exportMultiple, setExportMultiple] = React.useState(false)
  const [exportType, setExportType] = React.useState<string>(TDExportType.PNG)

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
    if (exportMultiple) {
      for (const page of selectedPages) {
        app.changePage(page)
        await app.exportImage(exportType as any, {
          scale: 2,
          quality: 1,
          pageId: page,
          ids: Object.keys(app.document.pages[page].shapes),
        })
      }
    } else {
      app.exportImage(exportType as any, { scale: 2, quality: 1 })
    }
  }, [exportType, selectedPages, exportMultiple])

  const handleSelectMultiple = React.useCallback(
    () => setExportMultiple(!exportMultiple),
    [exportMultiple]
  )

  return (
    <div>
      <Dialog.Root open={isOpen}>
        <Dialog.Portal container={container.current}>
          <DialogOverlay />
          <StyledContent css={{ padding: 12 }} dir="ltr">
            <DialogTitle>
              <FormattedMessage id="export" />
              <Dialog.Close onClick={onClose} asChild>
                <DialogIconButton>
                  <Cross2Icon />
                </DialogIconButton>
              </Dialog.Close>
            </DialogTitle>
            <Flex>
              <Label>Format</Label>
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
            </Flex>
            <Flex>
              <Label>Background</Label>
              <Select
                onChange={(event) => {
                  const background = event.target.value
                  app.setSetting('exportBackground', background as TDExportBackground)
                }}
                defaultValue={settings.exportBackground}
              >
                {Object.values(TDExportBackground).map((exportBackground) => (
                  <option key={exportBackground} value={exportBackground}>
                    {exportBackground}
                  </option>
                ))}
              </Select>
            </Flex>
            <CheckWrapper htmlFor="multiple">
              <input
                type="checkbox"
                id="multiple"
                checked={exportMultiple}
                onChange={handleSelectMultiple}
              />
              <Label>Export multiple page</Label>
            </CheckWrapper>
            {exportMultiple ? (
              <Popover.Root>
                <Popover.Trigger asChild>
                  <Trigger>
                    Select pages ({selectedPages.length} of {Object.keys(app.document.pages).length}{' '}
                    selected)
                    <ChevronDownIcon />
                  </Trigger>
                </Popover.Trigger>
                <Popover.Anchor />
                <Popover.Portal container={rContainer}>
                  <Content sideOffset={5}>
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
                  </Content>
                </Popover.Portal>
              </Popover.Root>
            ) : null}

            <ExportButton disabled={selectedPages.length === 0} onClick={handleExportPages}>
              <FormattedMessage id="export" />
            </ExportButton>
          </StyledContent>
        </Dialog.Portal>
      </Dialog.Root>
      <div ref={setRContainer} />
    </div>
  )
}

const Trigger = styled('div', {
  backgroundColor: '$panel',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 4px',
  marginBottom: 8,
  cursor: 'pointer',
  color: '$text',
  fontSize: '$2',
  border: '1px solid $hover',
  fontFamily: '$ui',
  borderRadius: 4,
})

const Content = styled(Popover.Content, {
  borderRadius: 4,
  width: 276,
  height: 'fit-content',
  backgroundColor: '$panel',
  padding: '2px 6px',
  marginTop: '-10px',
})

const CheckWrapper = styled('label', {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 0px',
})

const Flex = styled('div', {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 0px',
})

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
  gap: 10,
  listStyleType: 'none',
  marginTop: 20,
  padding: 0,
  maxHeight: 240,
  overflowY: 'auto',
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
