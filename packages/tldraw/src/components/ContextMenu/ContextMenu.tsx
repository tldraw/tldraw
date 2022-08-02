import * as RadixContextMenu from '@radix-ui/react-context-menu'
import {
  AlignBottomIcon,
  AlignCenterHorizontallyIcon,
  AlignCenterVerticallyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
  SpaceEvenlyHorizontallyIcon,
  SpaceEvenlyVerticallyIcon,
  StretchHorizontallyIcon,
  StretchVerticallyIcon,
} from '@radix-ui/react-icons'
import * as React from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Divider } from '~components/Primitives/Divider'
import { MenuContent } from '~components/Primitives/MenuContent'
import { RowButton, RowButtonProps } from '~components/Primitives/RowButton'
import { ToolButton, ToolButtonProps } from '~components/Primitives/ToolButton'
import { useContainer, useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { AlignType, DistributeType, StretchType, TDExportType, TDSnapshot } from '~types'

const numberOfSelectedIdsSelector = (s: TDSnapshot) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.length
}

const isDebugModeSelector = (s: TDSnapshot) => {
  return s.settings.isDebugMode
}

const hasGroupSelectedSelector = (s: TDSnapshot) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.some(
    (id) => s.document.pages[s.appState.currentPageId].shapes[id].children !== undefined
  )
}

const preventDefault = (e: Event) => e.stopPropagation()

interface ContextMenuProps {
  onBlur?: React.FocusEventHandler
  children: React.ReactNode
}

export const ContextMenu = ({ onBlur, children }: ContextMenuProps) => {
  const container = useContainer()

  return (
    <RadixContextMenu.Root dir="ltr">
      <RadixContextMenu.Trigger dir="ltr">{children}</RadixContextMenu.Trigger>
      <RadixContextMenu.Portal container={container.current}>
        <RadixContextMenu.Content
          onEscapeKeyDown={preventDefault}
          tabIndex={-1}
          onBlur={onBlur}
          asChild
        >
          <MenuContent id="TD-ContextMenu">
            <InnerMenu />
          </MenuContent>
        </RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  )
}

const InnerMenu = React.memo(function InnerMenu() {
  const app = useTldrawApp()
  const intl = useIntl()
  const numberOfSelectedIds = app.useStore(numberOfSelectedIdsSelector)
  const isDebugMode = app.useStore(isDebugModeSelector)
  const hasGroupSelected = app.useStore(hasGroupSelectedSelector)

  const handleFlipHorizontal = React.useCallback(() => {
    app.flipHorizontal()
  }, [app])

  const handleFlipVertical = React.useCallback(() => {
    app.flipVertical()
  }, [app])

  const handleDuplicate = React.useCallback(() => {
    app.duplicate()
  }, [app])

  const handleLock = React.useCallback(() => {
    app.toggleLocked()
  }, [app])

  const handleGroup = React.useCallback(() => {
    app.group()
  }, [app])

  const handleMoveToBack = React.useCallback(() => {
    app.moveToBack()
  }, [app])

  const handleMoveBackward = React.useCallback(() => {
    app.moveBackward()
  }, [app])

  const handleMoveForward = React.useCallback(() => {
    app.moveForward()
  }, [app])

  const handleMoveToFront = React.useCallback(() => {
    app.moveToFront()
  }, [app])

  const handleDelete = React.useCallback(() => {
    app.delete()
  }, [app])

  const handleCut = React.useCallback(() => {
    app.cut()
  }, [app])

  const handleCopy = React.useCallback(() => {
    app.copy()
  }, [app])

  const handlePaste = React.useCallback(() => {
    app.paste()
  }, [app])

  const handleCopySVG = React.useCallback(() => {
    app.copyImage(TDExportType.SVG, { scale: 1, quality: 1, transparentBackground: false })
  }, [app])

  const handleCopyPNG = React.useCallback(() => {
    app.copyImage(TDExportType.PNG, { scale: 2, quality: 1, transparentBackground: true })
  }, [app])

  const handleUndo = React.useCallback(() => {
    app.undo()
  }, [app])

  const handleRedo = React.useCallback(() => {
    app.redo()
  }, [app])

  const handleExportPNG = React.useCallback(async () => {
    app.exportImage(TDExportType.PNG, { scale: 2, quality: 1 })
  }, [app])

  const handleExportJPG = React.useCallback(async () => {
    app.exportImage(TDExportType.JPG, { scale: 2, quality: 1 })
  }, [app])

  const handleExportWEBP = React.useCallback(async () => {
    app.exportImage(TDExportType.WEBP, { scale: 2, quality: 1 })
  }, [app])

  const handleExportSVG = React.useCallback(async () => {
    app.exportImage(TDExportType.SVG, { scale: 1, quality: 1 })
  }, [app])

  const handleCopyJSON = React.useCallback(async () => {
    app.copyJson()
  }, [app])

  const handleExportJSON = React.useCallback(async () => {
    app.exportJson()
  }, [app])

  const hasSelection = numberOfSelectedIds > 0
  const hasTwoOrMore = numberOfSelectedIds > 1
  const hasThreeOrMore = numberOfSelectedIds > 2

  return (
    <>
      {hasSelection ? (
        <>
          <CMRowButton onClick={handleDuplicate} kbd="#D" id="TD-ContextMenu-Duplicate">
            <FormattedMessage id="duplicate" />
          </CMRowButton>
          <CMRowButton onClick={handleFlipHorizontal} kbd="⇧H" id="TD-ContextMenu-Flip_Horizontal">
            <FormattedMessage id="flip.horizontal" />
          </CMRowButton>
          <CMRowButton onClick={handleFlipVertical} kbd="⇧V" id="TD-ContextMenu-Flip_Vertical">
            <FormattedMessage id="flip.vertical" />
          </CMRowButton>
          <CMRowButton onClick={handleLock} kbd="#⇧L" id="TD-ContextMenu- Lock_Unlock">
            <FormattedMessage id="lock" /> / <FormattedMessage id="unlock" />
          </CMRowButton>
          {(hasTwoOrMore || hasGroupSelected) && <Divider />}
          {hasTwoOrMore && (
            <CMRowButton onClick={handleGroup} kbd="#G" id="TD-ContextMenu-Group">
              <FormattedMessage id="group" />
            </CMRowButton>
          )}
          {hasGroupSelected && (
            <CMRowButton onClick={handleGroup} kbd="#G" id="TD-ContextMenu-Ungroup">
              <FormattedMessage id="ungroup" />
            </CMRowButton>
          )}
          <Divider />
          <ContextMenuSubMenu label={intl.formatMessage({ id: 'move' })} id="TD-ContextMenu-Move">
            <CMRowButton onClick={handleMoveToFront} kbd="⇧]" id="TD-ContextMenu-Move-To_Front">
              <FormattedMessage id="to.front" />
            </CMRowButton>
            <CMRowButton onClick={handleMoveForward} kbd="]" id="TD-ContextMenu-Move-Forward">
              <FormattedMessage id="forward" />
            </CMRowButton>
            <CMRowButton onClick={handleMoveBackward} kbd="[" id="TD-ContextMenu-Move-Backward">
              <FormattedMessage id="backward" />
            </CMRowButton>
            <CMRowButton onClick={handleMoveToBack} kbd="⇧[" id="TD-ContextMenu-Move-To_Back">
              <FormattedMessage id="back" />
            </CMRowButton>
          </ContextMenuSubMenu>
          <MoveToPageMenu />
          {hasTwoOrMore && (
            <AlignDistributeSubMenu hasTwoOrMore={hasTwoOrMore} hasThreeOrMore={hasThreeOrMore} />
          )}
          <Divider />
          <CMRowButton onClick={handleCut} kbd="#X" id="TD-ContextMenu-Cut">
            <FormattedMessage id="cut" />
          </CMRowButton>
          <CMRowButton onClick={handleCopy} kbd="#C" id="TD-ContextMenu-Copy">
            <FormattedMessage id="copy" />
          </CMRowButton>
          <CMRowButton onClick={handlePaste} kbd="#V" id="TD-ContextMenu-Paste">
            <FormattedMessage id="paste" />
          </CMRowButton>
          <Divider />
          <ContextMenuSubMenu
            label={`${intl.formatMessage({ id: 'copy.as' })}...`}
            size="small"
            id="TD-ContextMenu-Copy-As"
          >
            <CMRowButton onClick={handleCopySVG} id="TD-ContextMenu-Copy-as-SVG">
              SVG
            </CMRowButton>
            <CMRowButton onClick={handleCopyPNG} id="TD-ContextMenu-Copy-As-PNG">
              PNG
            </CMRowButton>
            {isDebugMode && (
              <CMRowButton onClick={handleCopyJSON} id="TD-ContextMenu-Copy_as_JSON">
                JSON
              </CMRowButton>
            )}
          </ContextMenuSubMenu>
          <ContextMenuSubMenu
            label={`${intl.formatMessage({ id: 'export.as' })}...`}
            size="small"
            id="TD-ContextMenu-Export"
          >
            <CMRowButton onClick={handleExportSVG} id="TD-ContextMenu-Export-SVG">
              SVG
            </CMRowButton>
            <CMRowButton onClick={handleExportPNG} id="TD-ContextMenu-Export-PNG">
              PNG
            </CMRowButton>
            <CMRowButton onClick={handleExportJPG} id="TD-ContextMenu-Export-JPG">
              JPG
            </CMRowButton>
            <CMRowButton onClick={handleExportWEBP} id="TD-ContextMenu-Export-WEBP">
              WEBP
            </CMRowButton>
            {isDebugMode && (
              <CMRowButton onClick={handleExportJSON} id="TD-ContextMenu-Export-JSON">
                JSON
              </CMRowButton>
            )}
          </ContextMenuSubMenu>
          <Divider />
          <CMRowButton onClick={handleDelete} kbd="⌫" id="TD-ContextMenu-Delete">
            <FormattedMessage id="delete" />
          </CMRowButton>
        </>
      ) : (
        <>
          <CMRowButton onClick={handlePaste} kbd="#V" id="TD-ContextMenu-Paste">
            <FormattedMessage id="paste" />
          </CMRowButton>
          <CMRowButton onClick={handleUndo} kbd="#Z" id="TD-ContextMenu-Undo">
            <FormattedMessage id="undo" />
          </CMRowButton>
          <CMRowButton onClick={handleRedo} kbd="#⇧Z" id="TD-ContextMenu-Redo">
            <FormattedMessage id="redo" />
          </CMRowButton>
        </>
      )}
    </>
  )
})

/* ---------- Align and Distribute Sub Menu --------- */

function AlignDistributeSubMenu({
  hasThreeOrMore,
}: {
  hasTwoOrMore: boolean
  hasThreeOrMore: boolean
}) {
  const app = useTldrawApp()

  const alignTop = React.useCallback(() => {
    app.align(AlignType.Top)
  }, [app])

  const alignCenterVertical = React.useCallback(() => {
    app.align(AlignType.CenterVertical)
  }, [app])

  const alignBottom = React.useCallback(() => {
    app.align(AlignType.Bottom)
  }, [app])

  const stretchVertically = React.useCallback(() => {
    app.stretch(StretchType.Vertical)
  }, [app])

  const distributeVertically = React.useCallback(() => {
    app.distribute(DistributeType.Vertical)
  }, [app])

  const alignLeft = React.useCallback(() => {
    app.align(AlignType.Left)
  }, [app])

  const alignCenterHorizontal = React.useCallback(() => {
    app.align(AlignType.CenterHorizontal)
  }, [app])

  const alignRight = React.useCallback(() => {
    app.align(AlignType.Right)
  }, [app])

  const stretchHorizontally = React.useCallback(() => {
    app.stretch(StretchType.Horizontal)
  }, [app])

  const distributeHorizontally = React.useCallback(() => {
    app.distribute(DistributeType.Horizontal)
  }, [app])

  const container = useContainer()

  return (
    <RadixContextMenu.Sub>
      <CMSubTriggerButton id="TD-ContextMenu-Align-Distribute-Trigger">
        <FormattedMessage id="align.distribute" />
      </CMSubTriggerButton>
      <RadixContextMenu.Portal container={container.current}>
        <RadixContextMenu.SubContent asChild sideOffset={4} alignOffset={-2}>
          <StyledGridContent numberOfSelected={hasThreeOrMore ? 'threeOrMore' : 'twoOrMore'}>
            <CMIconButton onClick={alignLeft} id="TD-ContextMenu-Align_Distribute-AlignLeft">
              <AlignLeftIcon />
            </CMIconButton>
            <CMIconButton
              onClick={alignCenterHorizontal}
              id="TD-ContextMenu-Align_Distribute-AlignCenterHorizontal"
            >
              <AlignCenterHorizontallyIcon />
            </CMIconButton>
            <CMIconButton onClick={alignRight} id="TD-ContextMenu-Align_Distribute-AlignRight">
              <AlignRightIcon />
            </CMIconButton>
            <CMIconButton
              onClick={stretchHorizontally}
              id="TD-ContextMenu-Align_Distribute-StretchHorizontal"
            >
              <StretchHorizontallyIcon />
            </CMIconButton>
            {hasThreeOrMore && (
              <CMIconButton
                onClick={distributeHorizontally}
                id="TD-ContextMenu-Align_Distribute-SpaceEvenlyHorizontal"
              >
                <SpaceEvenlyHorizontallyIcon />
              </CMIconButton>
            )}
            <CMIconButton onClick={alignTop} id="TD-ContextMenu-Align_Distribute-AlignTop">
              <AlignTopIcon />
            </CMIconButton>
            <CMIconButton
              onClick={alignCenterVertical}
              id="TD-ContextMenu-Align_Distribute-AlignCenterVertical"
            >
              <AlignCenterVerticallyIcon />
            </CMIconButton>
            <CMIconButton onClick={alignBottom} id="TD-ContextMenu-Align_Distribute-AlignBottom">
              <AlignBottomIcon />
            </CMIconButton>
            <CMIconButton
              onClick={stretchVertically}
              id="TD-ContextMenu-Align_Distribute-StretchVertical"
            >
              <StretchVerticallyIcon />
            </CMIconButton>
            {hasThreeOrMore && (
              <CMIconButton
                onClick={distributeVertically}
                id="TD-ContextMenu-Align_Distribute-SpaceEvenlyVertical"
              >
                <SpaceEvenlyVerticallyIcon />
              </CMIconButton>
            )}
            <CMArrow offset={13} />
          </StyledGridContent>
        </RadixContextMenu.SubContent>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Sub>
  )
}

const StyledGridContent = styled(MenuContent, {
  display: 'grid',
  variants: {
    numberOfSelected: {
      threeOrMore: {
        gridTemplateColumns: 'repeat(5, auto)',
      },
      twoOrMore: {
        gridTemplateColumns: 'repeat(4, auto)',
      },
    },
  },
})

/* -------------- Move to Page Sub Menu ------------- */

const currentPageIdSelector = (s: TDSnapshot) => s.appState.currentPageId
const documentPagesSelector = (s: TDSnapshot) => s.document.pages

function MoveToPageMenu() {
  const app = useTldrawApp()
  const currentPageId = app.useStore(currentPageIdSelector)
  const documentPages = app.useStore(documentPagesSelector)

  const sorted = Object.values(documentPages)
    .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
    .filter((a) => a.id !== currentPageId)

  const container = useContainer()

  if (sorted.length === 0) return null

  return (
    <RadixContextMenu.Sub>
      <CMSubTriggerButton>
        <FormattedMessage id="move.to.page" />
      </CMSubTriggerButton>
      <RadixContextMenu.Portal container={container.current}>
        <RadixContextMenu.SubContent sideOffset={4} alignOffset={-2} asChild>
          <MenuContent>
            {sorted.map(({ id, name }, i) => (
              <CMRowButton
                key={id}
                disabled={id === currentPageId}
                onClick={() => app.moveToPage(id)}
              >
                {name || `Page ${i}`}
              </CMRowButton>
            ))}
            <CMArrow offset={13} />
          </MenuContent>
        </RadixContextMenu.SubContent>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Sub>
  )
}

/* --------------------- Submenu -------------------- */

export interface ContextMenuSubMenuProps {
  label: string
  size?: 'small'
  children: React.ReactNode
  id?: string
}

export function ContextMenuSubMenu({ children, label, size, id }: ContextMenuSubMenuProps) {
  const container = useContainer()
  return (
    <RadixContextMenu.Sub>
      <CMSubTriggerButton>{label}</CMSubTriggerButton>
      <RadixContextMenu.Portal container={container.current}>
        <RadixContextMenu.SubContent sideOffset={4} alignOffset={-2} asChild>
          <MenuContent size={size}>
            {children}
            <CMArrow offset={13} />
          </MenuContent>
        </RadixContextMenu.SubContent>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Sub>
  )
}

/* ---------------------- Arrow --------------------- */

const CMArrow = styled(RadixContextMenu.ContextMenuArrow, {
  fill: '$panel',
})

/* ------------------- IconButton ------------------- */

function CMIconButton({ onSelect, ...rest }: ToolButtonProps) {
  return (
    <RadixContextMenu.ContextMenuItem dir="ltr" onSelect={onSelect} asChild>
      <ToolButton {...rest} />
    </RadixContextMenu.ContextMenuItem>
  )
}

/* -------------------- RowButton ------------------- */

const CMRowButton = ({ id, ...rest }: RowButtonProps) => {
  return (
    <RadixContextMenu.ContextMenuItem asChild id={id}>
      <RowButton {...rest} />
    </RadixContextMenu.ContextMenuItem>
  )
}

/* ----------------- Trigger Button ----------------- */

export const CMSubTriggerButton = ({ id, ...rest }: RowButtonProps) => {
  return (
    <RadixContextMenu.SubTrigger asChild id={id}>
      <RowButton hasArrow {...rest} />
    </RadixContextMenu.SubTrigger>
  )
}
