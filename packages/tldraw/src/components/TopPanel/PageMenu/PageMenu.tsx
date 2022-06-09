import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {
  PlusIcon,
  CheckIcon,
  Cross2Icon,
  DragHandleDots2Icon,
  FrameIcon,
  TextAlignJustifyIcon,
  TriangleRightIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons'
import { PageOptionsDialog } from '../PageOptionsDialog'
import { styled } from '~styles'
import { useTldrawApp } from '~hooks'
import type { TDSnapshot } from '~types'
import { DMCheckboxItem, DMContent, DMDivider } from '~components/Primitives/DropdownMenu'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { RowButton } from '~components/Primitives/RowButton'
import { ToolButton } from '~components/Primitives/ToolButton'
import { FormattedMessage } from 'react-intl'
import { GridType } from '@tldraw/core'
import { GRID_SIZE } from '~constants'
import { NumberInput } from '~components/Primitives/NumberInput'
import { Tooltip } from '~components/Primitives/Tooltip'
import { StyledRow } from '../StyleMenu'

const sortedSelector = (s: TDSnapshot) =>
  Object.values(s.document.pages).sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))

const currentPageSelector = (s: TDSnapshot) => s.document.pages[s.appState.currentPageId]

export function PageMenu() {
  const app = useTldrawApp()

  const rIsOpen = React.useRef(false)

  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    if (rIsOpen.current !== isOpen) {
      rIsOpen.current = isOpen
    }
  }, [isOpen])

  const handleClose = React.useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      if (rIsOpen.current !== isOpen) {
        setIsOpen(isOpen)
      }
    },
    [setIsOpen]
  )
  const currentPageName = app.useStore(currentPageSelector).name

  return (
    <DropdownMenu.Root dir="ltr" open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger dir="ltr" asChild id="TD-Page">
        <ToolButton variant="text">{currentPageName || 'Page'}</ToolButton>
      </DropdownMenu.Trigger>
      <DMContent variant="menu" align="start">
        {isOpen && <PageMenuContent onClose={handleClose} />}
      </DMContent>
    </DropdownMenu.Root>
  )
}

function PageMenuContent({ onClose }: { onClose: () => void }) {
  const app = useTldrawApp()

  const sortedPages = app.useStore(sortedSelector)

  const currentPage = app.useStore(currentPageSelector)

  const [gridType, setGridType] = React.useState<GridType | 'none'>(currentPage.gridType || 'none')
  const [gridSize, setGridSize] = React.useState(currentPage.gridSize || GRID_SIZE)

  const handleCreatePage = React.useCallback(() => {
    app.createPage()
  }, [app])

  const handleChangePage = React.useCallback(
    (id: string) => {
      onClose()
      app.changePage(id)
    },
    [app]
  )

  const handleGridTypeChange = React.useCallback(
    (v) => {
      if (v == '') v = 'none'
      setGridType(v)
      app.setGridType(currentPage.id, v == 'none' ? undefined : v)
    },
    [app, setGridType, currentPage]
  )

  const handleGridSizeChange = React.useCallback((v) => {
    setGridSize(v)
    app.setGridSize(currentPage.id, v);
  }, [app, setGridSize, currentPage]);

  const handleToggleSubgrid = React.useCallback(() => {
    app.toggleSubgrid(currentPage.id)
  }, [app, currentPage]);

  return (
    <>
      <DropdownMenu.RadioGroup dir="ltr" value={currentPage.id} onValueChange={handleChangePage}>
        <DropdownMenu.Label asChild>
          <TitleBox>Grid style</TitleBox>
        </DropdownMenu.Label>
        <StyledToggleGroup
          type="single"
          value={gridType}
          onValueChange={handleGridTypeChange}
          orientation="horizontal"
        >
          <StyledToggleItem value="none">
            <Tooltip label="None" side="bottom">
              <Cross2Icon />
            </Tooltip>
          </StyledToggleItem>
          <StyledToggleItem value="dots">
            <Tooltip label="Dots" side="bottom">
              <DragHandleDots2Icon />
            </Tooltip>
          </StyledToggleItem>
          <StyledToggleItem value="squares">
            <Tooltip label="Squares" side="bottom">
              <FrameIcon />
            </Tooltip>
          </StyledToggleItem>
          <StyledToggleItem value="lines">
            <Tooltip label="Lines" side="bottom">
              <TextAlignJustifyIcon />
            </Tooltip>
          </StyledToggleItem>
          <StyledToggleItem value="iso">
            <Tooltip label="Isometric" side="bottom">
              <TriangleRightIcon />
            </Tooltip>
          </StyledToggleItem>
          <StyledToggleItem value="music">
            <Tooltip label="Music sheet" side="bottom">
              <SpeakerLoudIcon />
            </Tooltip>
          </StyledToggleItem>
        </StyledToggleGroup>
        <StyledRow>
          <span>Grid size</span>
          <NumberInput value={gridSize} onChange={handleGridSizeChange} min={4} max={16} />
        </StyledRow>
        <DMCheckboxItem
          checked={currentPage.showSubgrid || false}
          onCheckedChange={handleToggleSubgrid}
        >
          Show Subgrid
        </DMCheckboxItem>
        <DMDivider />
        {sortedPages.map((page) => (
          <ButtonWithOptions key={page.id}>
            <DropdownMenu.RadioItem
              title={page.name || 'Page'}
              value={page.id}
              key={page.id}
              asChild
            >
              <PageButton>
                <span>{page.name || 'Page'}</span>
                <DropdownMenu.ItemIndicator>
                  <SmallIcon>
                    <CheckIcon />
                  </SmallIcon>
                </DropdownMenu.ItemIndicator>
              </PageButton>
            </DropdownMenu.RadioItem>
            <PageOptionsDialog page={page} onClose={onClose} />
          </ButtonWithOptions>
        ))}
      </DropdownMenu.RadioGroup>
      <DMDivider />
      <DropdownMenu.Item onSelect={handleCreatePage} asChild>
        <RowButton>
          <span>
            <FormattedMessage id="create.page" />
          </span>
          <SmallIcon>
            <PlusIcon />
          </SmallIcon>
        </RowButton>
      </DropdownMenu.Item>
    </>
  )
}

const ButtonWithOptions = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gridAutoFlow: 'column',

  '& > *[data-shy="true"]': {
    opacity: 0,
  },

  '&:hover > *[data-shy="true"]': {
    opacity: 1,
  },
})

export const PageButton = styled(RowButton, {
  minWidth: 128,
})

export const TitleBox = styled('div', {
  position: 'relative',
  width: '100%',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  height: '32px',
  outline: 'none',
  color: '$text',
  fontFamily: '$ui',
  fontWeight: 400,
  fontSize: '$1',
  borderRadius: 4,
  userSelect: 'none',
  margin: '0 0 0 $3',
  padding: '0 0',
  display: 'flex',
  alignItems: 'center',
})

export const StyledToggleGroup = styled(ToggleGroup.Root, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  margin: 0,
  border: 0,
  backgroundColor: 'transparent',
  height: '32px',
})

export const StyledToggleItem = styled(ToggleGroup.Item, {
  border: 'none',
  backgroundColor: 'transparent',
  height: '32px',
  width: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,

  '&[data-state=on]': {
    backgroundColor: '$hover',
  },
})
