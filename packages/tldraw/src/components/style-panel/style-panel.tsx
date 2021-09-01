import * as React from 'react'
import { Utils } from '@tldraw/core'
import { DotsHorizontalIcon, Cross2Icon } from '@radix-ui/react-icons'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'
import { ShapesFunctions } from './shapes-functions'
import { AlignDistribute } from './align-distribute'
import { QuickColorSelect } from './quick-color-select'
import { QuickSizeSelect } from './quick-size-select'
import { QuickDashSelect } from './quick-dash-select'
import { QuickFillSelect } from './quick-fill-select'
import { Tooltip } from '../shared/tooltip'
import { Kbd } from '../shared/kbd'
import {
  IconButton,
  ButtonsRow,
  breakpoints,
  RowButton,
  FloatingContainer,
  Divider,
} from '../shared'

const isStyleOpenSelector = (s: Data) => s.appState.isStyleOpen

export function StylePanel(): JSX.Element {
  const { tlstate, useSelector } = useTLDrawContext()
  const isOpen = useSelector(isStyleOpenSelector)

  return (
    <FloatingContainer direction="column">
      <ButtonsRow>
        <QuickColorSelect />
        <QuickSizeSelect />
        <QuickDashSelect />
        <QuickFillSelect />
        <IconButton
          bp={breakpoints}
          title="Style"
          size="small"
          onPointerDown={tlstate.toggleStylePanel}
        >
          <Tooltip label={isOpen ? 'Close' : 'More'}>
            {isOpen ? <Cross2Icon /> : <DotsHorizontalIcon />}
          </Tooltip>
        </IconButton>
      </ButtonsRow>
      {isOpen && <SelectedShapeContent />}
    </FloatingContainer>
  )
}

const showKbds = !Utils.isMobile()

const selectedShapesCountSelector = (s: Data) =>
  s.document.pageStates[s.appState.currentPageId].selectedIds.length

function SelectedShapeContent(): JSX.Element {
  const { tlstate, useSelector } = useTLDrawContext()
  const selectedShapesCount = useSelector(selectedShapesCountSelector)

  const handleCopy = React.useCallback(() => {
    tlstate.copy()
  }, [tlstate])

  const handlePaste = React.useCallback(() => {
    tlstate.paste()
  }, [tlstate])

  const handleCopySvg = React.useCallback(() => {
    tlstate.copySvg()
  }, [tlstate])

  return (
    <>
      <Divider />
      <ShapesFunctions />
      <Divider />
      <AlignDistribute
        hasTwoOrMore={selectedShapesCount > 1}
        hasThreeOrMore={selectedShapesCount > 2}
      />
      <Divider />
      <RowButton bp={breakpoints} disabled={selectedShapesCount === 0} onClick={handleCopy}>
        <span>Copy</span>
        {showKbds && <Kbd variant="menu">#C</Kbd>}
      </RowButton>
      <RowButton bp={breakpoints} onClick={handlePaste}>
        <span>Paste</span>
        {showKbds && <Kbd variant="menu">#V</Kbd>}
      </RowButton>
      <RowButton bp={breakpoints} onClick={handleCopySvg}>
        <span>Copy to SVG</span>
        {showKbds && <Kbd variant="menu">⇧#C</Kbd>}
      </RowButton>
    </>
  )
}
