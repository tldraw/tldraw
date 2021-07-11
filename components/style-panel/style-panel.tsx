import state, { useSelector } from 'state'
import {
  IconButton,
  ButtonsRow,
  breakpoints,
  RowButton,
  FloatingContainer,
  Divider,
  Kbd,
} from 'components/shared'
import ShapesFunctions from './shapes-functions'
import AlignDistribute from './align-distribute'
import QuickColorSelect from './quick-color-select'
import QuickSizeSelect from './quick-size-select'
import QuickDashSelect from './quick-dash-select'
import QuickFillSelect from './quick-fill-select'
import Tooltip from 'components/tooltip'
import { DotsHorizontalIcon, Cross2Icon } from '@radix-ui/react-icons'
import { commandKey, isMobile } from 'utils'

const handleStylePanelOpen = () => state.send('TOGGLED_STYLE_PANEL_OPEN')
const handleCopy = () => state.send('COPIED')
const handlePaste = () => state.send('PASTED')
const handleCopyToSvg = () => state.send('COPIED_TO_SVG')

export default function StylePanel(): JSX.Element {
  const isOpen = useSelector((s) => s.data.settings.isStyleOpen)

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
          onClick={handleStylePanelOpen}
        >
          <Tooltip label="More">
            {isOpen ? <Cross2Icon /> : <DotsHorizontalIcon />}
          </Tooltip>
        </IconButton>
      </ButtonsRow>
      {isOpen && <SelectedShapeContent />}
    </FloatingContainer>
  )
}

function SelectedShapeContent(): JSX.Element {
  const selectedShapesCount = useSelector((s) => s.values.selectedIds.length)

  const showKbds = !isMobile()

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
      <RowButton
        bp={breakpoints}
        disabled={selectedShapesCount === 0}
        onClick={handleCopy}
      >
        <span>Copy</span>
        {showKbds && (
          <Kbd>
            <span>{commandKey()}</span>
            <span>C</span>
          </Kbd>
        )}
      </RowButton>
      <RowButton bp={breakpoints} onClick={handlePaste}>
        <span>Paste</span>
        {showKbds && (
          <Kbd>
            <span>{commandKey()}</span>
            <span>V</span>
          </Kbd>
        )}
      </RowButton>
      <RowButton bp={breakpoints} onClick={handleCopyToSvg}>
        <span>Copy to SVG</span>
        {showKbds && (
          <Kbd>
            <span>⇧</span>
            <span>{commandKey()}</span>
            <span>C</span>
          </Kbd>
        )}
      </RowButton>
    </>
  )
}
