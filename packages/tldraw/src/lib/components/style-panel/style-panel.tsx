import { Kbd } from '../kbd'
import {
  IconButton,
  ButtonsRow,
  breakpoints,
  RowButton,
  FloatingContainer,
  Divider,
} from '../shared'

import { tlstate, useAppState } from '../../state/state2'
import { ShapesFunctions } from './shapes-functions'
import { AlignDistribute } from './align-distribute'
import { QuickColorSelect } from './quick-color-select'
import { QuickSizeSelect } from './quick-size-select'
import { QuickDashSelect } from './quick-dash-select'
import { QuickFillSelect } from './quick-fill-select'
import { Tooltip } from '../tooltip'
import { DotsHorizontalIcon, Cross2Icon } from '@radix-ui/react-icons'
import { Utils } from '@tldraw/core'

const handleStylePanelOpen = () => tlstate.toggleStylePanel()
const handleCopy = () => tlstate.copy()
const handlePaste = () => tlstate.paste()
const handleCopyToSvg = () => tlstate.copyToSvg()

export function StylePanel(): JSX.Element {
  const isOpen = useAppState((s) => s.appState.isStyleOpen)

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
          onPointerDown={handleStylePanelOpen}
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

function SelectedShapeContent(): JSX.Element {
  const selectedShapesCount = useAppState((s) => s.pageState.selectedIds.length)

  const showKbds = !Utils.isMobile()

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
      <RowButton bp={breakpoints} onClick={handleCopyToSvg}>
        <span>Copy to SVG</span>
        {showKbds && <Kbd variant="menu">⇧#C</Kbd>}
      </RowButton>
    </>
  )
}
