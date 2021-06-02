import styled from 'styles'
import state, { useSelector } from 'state'
import * as Panel from 'components/panel'
import { useRef } from 'react'
import { IconButton } from 'components/shared'
import * as Checkbox from '@radix-ui/react-checkbox'
import { ChevronDown, Square, Trash2, X } from 'react-feather'
import { deepCompare, deepCompareArrays, getPage } from 'utils/utils'
import { strokes } from 'lib/shape-styles'
import AlignDistribute from './align-distribute'
import { MoveType } from 'types'
import SizePicker from './size-picker'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  AspectRatioIcon,
  BoxIcon,
  CheckIcon,
  CopyIcon,
  DotsVerticalIcon,
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
import ColorContent from './color-content'
import { RowButton, IconWrapper } from './shared'
import ColorPicker from './color-picker'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import IsFilledPicker from './is-filled-picker'
import QuickSizeSelect from './quick-size-select'
import QuickdashSelect from './quick-dash-select'

export default function StylePanel() {
  const rContainer = useRef<HTMLDivElement>(null)
  const isOpen = useSelector((s) => s.data.settings.isStyleOpen)

  return (
    <StylePanelRoot ref={rContainer} isOpen={isOpen}>
      {isOpen ? (
        <SelectedShapeStyles />
      ) : (
        <>
          <QuickColorSelect />
          <QuickSizeSelect />
          <QuickdashSelect />
          <IconButton
            title="Style"
            size="small"
            onClick={() => state.send('TOGGLED_STYLE_PANEL_OPEN')}
          >
            <ChevronDown />
          </IconButton>
        </>
      )}
    </StylePanelRoot>
  )
}

// This panel is going to be hard to keep cool, as we're selecting computed
// information, based on the user's current selection. We might have to keep
// track of this data manually within our state.

function SelectedShapeStyles() {
  const selectedIds = useSelector(
    (s) => Array.from(s.data.selectedIds.values()),
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
          size="small"
          onClick={() => state.send('TOGGLED_STYLE_PANEL_OPEN')}
        >
          <X />
        </IconButton>
      </Panel.Header>
      <Content>
        <ColorPicker
          color={commonStyle.color}
          onChange={(color) => state.send('CHANGED_STYLE', { color })}
        />
        <IsFilledPicker
          isFilled={commonStyle.isFilled}
          onChange={(isFilled) => state.send('CHANGED_STYLE', { isFilled })}
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
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('DUPLICATED')}
          >
            <CopyIcon />
          </IconButton>
          <IconButton
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('ROTATED_CCW')}
          >
            <RotateCounterClockwiseIcon />
          </IconButton>
          <IconButton
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('TOGGLED_SHAPE_HIDE')}
          >
            {isAllHidden ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </IconButton>
          <IconButton
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('TOGGLED_SHAPE_LOCK')}
          >
            {isAllLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
          </IconButton>
          <IconButton
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('TOGGLED_SHAPE_ASPECT_LOCK')}
          >
            {isAllAspectLocked ? <AspectRatioIcon /> : <BoxIcon />}
          </IconButton>
        </ButtonsRow>
        <ButtonsRow>
          <IconButton
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('MOVED', { type: MoveType.ToBack })}
          >
            <PinBottomIcon />
          </IconButton>
          <IconButton
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('MOVED', { type: MoveType.Backward })}
          >
            <ArrowDownIcon />
          </IconButton>
          <IconButton
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('MOVED', { type: MoveType.Forward })}
          >
            <ArrowUpIcon />
          </IconButton>
          <IconButton
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('MOVED', { type: MoveType.ToFront })}
          >
            <PinTopIcon />
          </IconButton>
          <IconButton
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('DELETED')}
          >
            <Trash2 />
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
    fontSize: '$2',
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
