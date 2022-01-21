import * as React from 'react'
import { styled } from '~styles'
import * as RadixContextMenu from '@radix-ui/react-context-menu'
import { useTldrawApp } from '~hooks'
import { TDSnapshot, AlignType, DistributeType, StretchType, TDExportTypes } from '~types'
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
import { Divider } from '~components/Primitives/Divider'
import { MenuContent } from '~components/Primitives/MenuContent'
import { RowButton, RowButtonProps } from '~components/Primitives/RowButton'
import { ToolButton, ToolButtonProps } from '~components/Primitives/ToolButton'

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

export const ContextMenu = ({ onBlur, children }: ContextMenuProps): JSX.Element => {
  return (
    <RadixContextMenu.Root dir="ltr">
      <RadixContextMenu.Trigger dir="ltr">{children}</RadixContextMenu.Trigger>
      <InnerMenu onBlur={onBlur} />
    </RadixContextMenu.Root>
  )
}

interface InnerContextMenuProps {
  onBlur?: React.FocusEventHandler
}

const InnerMenu = React.memo(function InnerMenu({ onBlur }: InnerContextMenuProps) {
  const app = useTldrawApp()
  const numberOfSelectedIds = app.useStore(numberOfSelectedIdsSelector)
  const isDebugMode = app.useStore(isDebugModeSelector)
  const hasGroupSelected = app.useStore(hasGroupSelectedSelector)

  const rContent = React.useRef<HTMLDivElement>(null)

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

  const handleCopyJson = React.useCallback(() => {
    app.copyJson()
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

  const handleCopySvg = React.useCallback(() => {
    app.copySvg()
  }, [app])

  const handleUndo = React.useCallback(() => {
    app.undo()
  }, [app])

  const handleRedo = React.useCallback(() => {
    app.redo()
  }, [app])

  const handleExportPNG = React.useCallback(async () => {
    await app.exportSelectedShapesAs(TDExportTypes.PNG)
  }, [app])

  const handleExportJPG = React.useCallback(async () => {
    await app.exportSelectedShapesAs(TDExportTypes.JPG)
  }, [app])

  const handleExportWEBP = React.useCallback(async () => {
    await app.exportSelectedShapesAs(TDExportTypes.WEBP)
  }, [app])

  const handleExportSVG = React.useCallback(async () => {
    await app.exportSelectedShapesAs(TDExportTypes.SVG)
  }, [app])

  const handleExportJSON = React.useCallback(async () => {
    await app.exportSelectedShapesAs(TDExportTypes.JSON)
  }, [app])

  const hasSelection = numberOfSelectedIds > 0
  const hasTwoOrMore = numberOfSelectedIds > 1
  const hasThreeOrMore = numberOfSelectedIds > 2

  return (
    <RadixContextMenu.Content
      dir="ltr"
      ref={rContent}
      onEscapeKeyDown={preventDefault}
      asChild
      tabIndex={-1}
      onBlur={onBlur}
    >
      <MenuContent id="TD-ContextMenu">
        {hasSelection ? (
          <>
            <CMRowButton onClick={handleDuplicate} kbd="#D" id="TD-ContextMenu-Duplicate">
              Duplicate
            </CMRowButton>
            <CMRowButton
              onClick={handleFlipHorizontal}
              kbd="⇧H"
              id="TD-ContextMenu-Flip_Horizontal"
            >
              Flip Horizontal
            </CMRowButton>
            <CMRowButton onClick={handleFlipVertical} kbd="⇧V" id="TD-ContextMenu-Flip_Vertical">
              Flip Vertical
            </CMRowButton>
            <CMRowButton onClick={handleLock} kbd="#⇧L" id="TD-ContextMenu- Lock_Unlock">
              Lock / Unlock
            </CMRowButton>
            {(hasTwoOrMore || hasGroupSelected) && <Divider />}
            {hasTwoOrMore && (
              <CMRowButton onClick={handleGroup} kbd="#G" id="TD-ContextMenu-Group">
                Group
              </CMRowButton>
            )}
            {hasGroupSelected && (
              <CMRowButton onClick={handleGroup} kbd="#G" id="TD-ContextMenu-Ungroup">
                Ungroup
              </CMRowButton>
            )}
            <Divider />
            <ContextMenuSubMenu label="Move" id="TD-ContextMenu-Move">
              <CMRowButton onClick={handleMoveToFront} kbd="⇧]" id="TD-ContextMenu-Move-To_Front">
                To Front
              </CMRowButton>
              <CMRowButton onClick={handleMoveForward} kbd="]" id="TD-ContextMenu-Move-Forward">
                Forward
              </CMRowButton>
              <CMRowButton onClick={handleMoveBackward} kbd="[" id="TD-ContextMenu-Move-Backward">
                Backward
              </CMRowButton>
              <CMRowButton onClick={handleMoveToBack} kbd="⇧[" id="TD-ContextMenu-Move-To_Back">
                To Back
              </CMRowButton>
            </ContextMenuSubMenu>
            <MoveToPageMenu />
            {hasTwoOrMore && (
              <AlignDistributeSubMenu hasTwoOrMore={hasTwoOrMore} hasThreeOrMore={hasThreeOrMore} />
            )}
            {app.callbacks.onExport ? (
              <>
                <Divider />
                <ContextMenuSubMenu label="Export" size="small" id="TD-ContextMenu-Export">
                  <CMRowButton onClick={handleExportPNG} id="TD-ContextMenu-Export-PNG">
                    PNG
                  </CMRowButton>
                  <CMRowButton onClick={handleExportJPG} id="TD-ContextMenu-Export-JPG">
                    JPG
                  </CMRowButton>
                  <CMRowButton onClick={handleExportWEBP} id="TD-ContextMenu-Export-WEBP">
                    WEBP
                  </CMRowButton>
                  <CMRowButton onClick={handleExportSVG} id="TD-ContextMenu-Export-SVG">
                    SVG
                  </CMRowButton>
                  <CMRowButton onClick={handleExportJSON} id="TD-ContextMenu-Export-JSON">
                    JSON
                  </CMRowButton>
                  <Divider />
                  <CMRowButton
                    onClick={handleCopySvg}
                    kbd="#⇧C"
                    id="TD-ContextMenu-Export-Copy_as_SVG"
                  >
                    Copy as SVG
                  </CMRowButton>
                  {isDebugMode && (
                    <CMRowButton onClick={handleCopyJson} id="TD-ContextMenu-Export-Copy_as_JSON">
                      Copy as JSON
                    </CMRowButton>
                  )}
                </ContextMenuSubMenu>
              </>
            ) : (
              <>
                <Divider />
                <CMRowButton
                  onClick={handleCopySvg}
                  kbd="#⇧C"
                  id="TD-ContextMenu-Export-Copy_as_SVG"
                >
                  Copy as SVG
                </CMRowButton>
                {isDebugMode && (
                  <CMRowButton onClick={handleCopyJson} id="TD-ContextMenu-Export-Copy_as_JSON">
                    Copy as JSON
                  </CMRowButton>
                )}
              </>
            )}
            <Divider />
            <CMRowButton onClick={handleCut} kbd="#X" id="TD-ContextMenu-Cut">
              Cut
            </CMRowButton>
            <CMRowButton onClick={handleCopy} kbd="#C" id="TD-ContextMenu-Copy">
              Copy
            </CMRowButton>
            <CMRowButton onClick={handlePaste} kbd="#V" id="TD-ContextMenu-Paste">
              Paste
            </CMRowButton>

            <Divider />
            <CMRowButton onClick={handleDelete} kbd="⌫" id="TD-ContextMenu-Delete">
              Delete
            </CMRowButton>
          </>
        ) : (
          <>
            <CMRowButton onClick={handlePaste} kbd="#V" id="TD-ContextMenu-Paste">
              Paste
            </CMRowButton>
            <CMRowButton onClick={handleUndo} kbd="#Z" id="TD-ContextMenu-Undo">
              Undo
            </CMRowButton>
            <CMRowButton onClick={handleRedo} kbd="#⇧Z" id="TD-ContextMenu-Redo">
              Redo
            </CMRowButton>
          </>
        )}
      </MenuContent>
    </RadixContextMenu.Content>
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

  return (
    <span id="TD-ContextMenu-Align_Duplicate">
      <RadixContextMenu.Root dir="ltr">
        <CMTriggerButton isSubmenu>Align / Distribute</CMTriggerButton>
        <RadixContextMenu.Content asChild sideOffset={2} alignOffset={-2}>
          <StyledGridContent numberOfSelected={hasThreeOrMore ? 'threeOrMore' : 'twoOrMore'}>
            <CMIconButton onClick={alignLeft} id="TD-ContextMenu-Align_Duplicate-AlignLeft">
              <AlignLeftIcon />
            </CMIconButton>
            <CMIconButton
              onClick={alignCenterHorizontal}
              id="TD-ContextMenu-Align_Duplicate-AlignCenterHorizontal"
            >
              <AlignCenterHorizontallyIcon />
            </CMIconButton>
            <CMIconButton onClick={alignRight} id="TD-ContextMenu-Align_Duplicate-AlignRight">
              <AlignRightIcon />
            </CMIconButton>
            <CMIconButton
              onClick={stretchHorizontally}
              id="TD-ContextMenu-Align_Duplicate-StretchHorizontal"
            >
              <StretchHorizontallyIcon />
            </CMIconButton>
            {hasThreeOrMore && (
              <CMIconButton
                onClick={distributeHorizontally}
                id="TD-ContextMenu-Align_Duplicate-SpaceEvenlyHorizontal"
              >
                <SpaceEvenlyHorizontallyIcon />
              </CMIconButton>
            )}
            <CMIconButton onClick={alignTop} id="TD-ContextMenu-Align_Duplicate-AlignTop">
              <AlignTopIcon />
            </CMIconButton>
            <CMIconButton
              onClick={alignCenterVertical}
              id="TD-ContextMenu-Align_Duplicate-AlignCenterVertical"
            >
              <AlignCenterVerticallyIcon />
            </CMIconButton>
            <CMIconButton onClick={alignBottom} id="TD-ContextMenu-Align_Duplicate-AlignBottom">
              <AlignBottomIcon />
            </CMIconButton>
            <CMIconButton
              onClick={stretchVertically}
              id="TD-ContextMenu-Align_Duplicate-StretchVertical"
            >
              <StretchVerticallyIcon />
            </CMIconButton>
            {hasThreeOrMore && (
              <CMIconButton
                onClick={distributeVertically}
                id="TD-ContextMenu-Align_Duplicate-SpaceEvenlyVertical"
              >
                <SpaceEvenlyVerticallyIcon />
              </CMIconButton>
            )}
            <CMArrow offset={13} />
          </StyledGridContent>
        </RadixContextMenu.Content>
      </RadixContextMenu.Root>
    </span>
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

function MoveToPageMenu(): JSX.Element | null {
  const app = useTldrawApp()
  const currentPageId = app.useStore(currentPageIdSelector)
  const documentPages = app.useStore(documentPagesSelector)

  const sorted = Object.values(documentPages)
    .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
    .filter((a) => a.id !== currentPageId)

  if (sorted.length === 0) return null

  return (
    <RadixContextMenu.Root dir="ltr">
      <CMTriggerButton isSubmenu>Move To Page</CMTriggerButton>
      <RadixContextMenu.Content dir="ltr" sideOffset={2} alignOffset={-2} asChild>
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
      </RadixContextMenu.Content>
    </RadixContextMenu.Root>
  )
}

/* --------------------- Submenu -------------------- */

export interface ContextMenuSubMenuProps {
  label: string
  size?: 'small'
  children: React.ReactNode
  id?: string
}

export function ContextMenuSubMenu({
  children,
  label,
  size,
  id,
}: ContextMenuSubMenuProps): JSX.Element {
  return (
    <span id={id}>
      <RadixContextMenu.Root dir="ltr">
        <CMTriggerButton isSubmenu>{label}</CMTriggerButton>
        <RadixContextMenu.Content dir="ltr" sideOffset={2} alignOffset={-2} asChild>
          <MenuContent size={size}>
            {children}
            <CMArrow offset={13} />
          </MenuContent>
        </RadixContextMenu.Content>
      </RadixContextMenu.Root>
    </span>
  )
}

/* ---------------------- Arrow --------------------- */

const CMArrow = styled(RadixContextMenu.ContextMenuArrow, {
  fill: '$panel',
})

/* ------------------- IconButton ------------------- */

function CMIconButton({ onSelect, ...rest }: ToolButtonProps): JSX.Element {
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

interface CMTriggerButtonProps extends RowButtonProps {
  isSubmenu?: boolean
}

export const CMTriggerButton = ({ isSubmenu, ...rest }: CMTriggerButtonProps) => {
  return (
    <RadixContextMenu.ContextMenuTriggerItem asChild>
      <RowButton hasArrow={isSubmenu} {...rest} />
    </RadixContextMenu.ContextMenuTriggerItem>
  )
}
