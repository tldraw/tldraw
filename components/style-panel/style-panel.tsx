import styled from 'styles'
import state, { useSelector } from 'state'
import * as Panel from 'components/panel'
import { useRef } from 'react'
import { IconButton } from 'components/shared'
import { ChevronDown, Trash2, X } from 'react-feather'
import {
  deepCompare,
  deepCompareArrays,
  getPage,
  getSelectedIds,
  setToArray,
} from 'utils'
import AlignDistribute from './align-distribute'
import { MoveType } from 'types'
import SizePicker from './size-picker'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  AspectRatioIcon,
  BoxIcon,
  CopyIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  LockClosedIcon,
  LockOpen1Icon,
  PinBottomIcon,
  PinTopIcon,
  RotateCounterClockwiseIcon,
} from '@radix-ui/react-icons'
import DashPicker from './dash-picker'
import QuickColorSelect from './quick-color-select'
import ColorPicker from './color-picker'
import IsFilledPicker from './is-filled-picker'
import QuickSizeSelect from './quick-size-select'
import QuickdashSelect from './quick-dash-select'
import Tooltip from 'components/tooltip'

const breakpoints = { '@initial': 'mobile', '@sm': 'small' } as any
const handleStylePanelOpen = () => state.send('TOGGLED_STYLE_PANEL_OPEN')
const handleColorChange = (color) => state.send('CHANGED_STYLE', { color })
const handleRotateCcw = () => () => state.send('ROTATED_CCW')
const handleIsFilledChange = (dash) => state.send('CHANGED_STYLE', { dash })
const handleDuplicate = () => state.send('DUPLICATED')
const handleHide = () => state.send('TOGGLED_SHAPE_HIDE')
const handleLock = () => state.send('TOGGLED_SHAPE_LOCK')
const handleAspectLock = () => state.send('TOGGLED_SHAPE_ASPECT_LOCK')
const handleMoveToBack = () => state.send('MOVED', { type: MoveType.ToBack })
const handleMoveBackward = () =>
  state.send('MOVED', { type: MoveType.Backward })
const handleMoveForward = () => state.send('MOVED', { type: MoveType.Forward })
const handleMoveToFront = () => state.send('MOVED', { type: MoveType.ToFront })
const handleDelete = () => state.send('DELETED')

export default function StylePanel(): JSX.Element {
  const rContainer = useRef<HTMLDivElement>(null)
  const isOpen = useSelector((s) => s.data.settings.isStyleOpen)

  return (
    <StylePanelRoot dir="ltr" ref={rContainer} isOpen={isOpen}>
      {isOpen ? (
        <SelectedShapeStyles />
      ) : (
        <>
          <QuickColorSelect />
          <QuickSizeSelect />
          <QuickdashSelect />
          <IconButton
            bp={breakpoints}
            title="Style"
            size="small"
            onClick={handleStylePanelOpen}
          >
            <Tooltip label="More">
              <ChevronDown />
            </Tooltip>
          </IconButton>
        </>
      )}
    </StylePanelRoot>
  )
}

// This panel is going to be hard to keep cool, as we're selecting computed
// information, based on the user's current selection. We might have to keep
// track of this data manually within our state.

function SelectedShapeStyles(): JSX.Element {
  const selectedIds = useSelector(
    (s) => setToArray(getSelectedIds(s.data)),
    deepCompareArrays
  )

  const isAllLocked = useSelector((s) => {
    const page = getPage(s.data)
    return selectedIds.every((id) => page.shapes[id].isLocked)
  })

  const isAllAspectLocked = useSelector((s) => {
    const page = getPage(s.data)
    return selectedIds.every((id) => page.shapes[id].isAspectRatioLocked)
  })

  const isAllHidden = useSelector((s) => {
    const page = getPage(s.data)
    return selectedIds.every((id) => page.shapes[id].isHidden)
  })

  const commonStyle = useSelector((s) => s.values.selectedStyle, deepCompare)

  const hasSelection = selectedIds.length > 0

  return (
    <Panel.Layout>
      <Panel.Header side="right">
        <h3>Style</h3>
        <IconButton
          bp={breakpoints}
          size="small"
          onClick={handleStylePanelOpen}
        >
          <X />
        </IconButton>
      </Panel.Header>
      <Content>
        <ColorPicker color={commonStyle.color} onChange={handleColorChange} />
        <IsFilledPicker
          isFilled={commonStyle.isFilled}
          onChange={handleIsFilledChange}
        />
        <Row>
          <label htmlFor="size">Size</label>
          <SizePicker size={commonStyle.size} />
        </Row>
        <Row>
          <label htmlFor="dash">Dash</label>
          <DashPicker dash={commonStyle.dash} />
        </Row>
        <ButtonsRow>
          <IconButton
            bp={breakpoints}
            disabled={!hasSelection}
            size="small"
            onClick={handleDuplicate}
          >
            <Tooltip label="Duplicate">
              <CopyIcon />
            </Tooltip>
          </IconButton>

          <IconButton
            disabled={!hasSelection}
            size="small"
            onClick={handleRotateCcw}
          >
            <Tooltip label="Rotate">
              <RotateCounterClockwiseIcon />
            </Tooltip>
          </IconButton>

          <IconButton
            bp={breakpoints}
            disabled={!hasSelection}
            size="small"
            onClick={handleHide}
          >
            <Tooltip label="Toogle Hidden">
              {isAllHidden ? <EyeClosedIcon /> : <EyeOpenIcon />}
            </Tooltip>
          </IconButton>

          <IconButton
            bp={breakpoints}
            disabled={!hasSelection}
            size="small"
            onClick={handleLock}
          >
            <Tooltip label="Toogle Locked">
              {isAllLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
            </Tooltip>
          </IconButton>

          <IconButton
            bp={breakpoints}
            disabled={!hasSelection}
            size="small"
            onClick={handleAspectLock}
          >
            <Tooltip label="Toogle Aspect Ratio Lock">
              {isAllAspectLocked ? <AspectRatioIcon /> : <BoxIcon />}
            </Tooltip>
          </IconButton>
        </ButtonsRow>
        <ButtonsRow>
          <IconButton
            bp={breakpoints}
            disabled={!hasSelection}
            size="small"
            onClick={handleMoveToBack}
          >
            <Tooltip label="Move to Back">
              <PinBottomIcon />
            </Tooltip>
          </IconButton>

          <IconButton
            bp={breakpoints}
            disabled={!hasSelection}
            size="small"
            onClick={handleMoveBackward}
          >
            <Tooltip label="Move Backward">
              <ArrowDownIcon />
            </Tooltip>
          </IconButton>

          <IconButton
            bp={breakpoints}
            disabled={!hasSelection}
            size="small"
            onClick={handleMoveForward}
          >
            <Tooltip label="Move Forward">
              <ArrowUpIcon />
            </Tooltip>
          </IconButton>

          <IconButton
            bp={breakpoints}
            disabled={!hasSelection}
            size="small"
            onClick={handleMoveToFront}
          >
            <Tooltip label="More to Front">
              <PinTopIcon />
            </Tooltip>
          </IconButton>

          <IconButton
            bp={breakpoints}
            disabled={!hasSelection}
            size="small"
            onClick={handleDelete}
          >
            <Tooltip label="Delete">
              <Trash2 size="15" />
            </Tooltip>
          </IconButton>
        </ButtonsRow>
        <AlignDistribute
          hasTwoOrMore={selectedIds.length > 1}
          hasThreeOrMore={selectedIds.length > 2}
        />
      </Content>
    </Panel.Layout>
  )
}

const StylePanelRoot = styled(Panel.Root, {
  minWidth: 1,
  width: 184,
  maxWidth: 184,
  overflow: 'hidden',
  position: 'relative',
  border: '1px solid $panel',
  boxShadow: '0px 2px 4px rgba(0,0,0,.2)',
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'all',

  variants: {
    isOpen: {
      true: {},
      false: {
        padding: 2,
        width: 'fit-content',
      },
    },
  },
})

const Content = styled(Panel.Content, {
  padding: 8,
})

const Row = styled('div', {
  position: 'relative',
  display: 'flex',
  width: '100%',
  background: 'none',
  border: 'none',
  outline: 'none',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 2px 4px 12px',

  '& label': {
    fontFamily: '$ui',
    fontSize: '$1',
    fontWeight: '$1',
    margin: 0,
    padding: 0,
  },

  '& > svg': {
    position: 'relative',
  },
})

const ButtonsRow = styled('div', {
  position: 'relative',
  display: 'flex',
  width: '100%',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  outline: 'none',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: 4,
})
