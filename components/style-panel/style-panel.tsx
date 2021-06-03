import styled from 'styles'
import state, { useSelector } from 'state'
import * as Panel from 'components/panel'
import { useRef } from 'react'
import { IconButton } from 'components/shared'
import { ChevronDown, Trash2, X } from 'react-feather'
import { deepCompare, deepCompareArrays, getPage } from 'utils/utils'
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
            bp={{ '@initial': 'mobile', '@sm': 'small' }}
            title="Style"
            size="small"
            onClick={() => state.send('TOGGLED_STYLE_PANEL_OPEN')}
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
          bp={{ '@initial': 'mobile', '@sm': 'small' }}
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
            bp={{ '@initial': 'mobile', '@sm': 'small' }}
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('DUPLICATED')}
          >
            <Tooltip label="Duplicate">
              <CopyIcon />
            </Tooltip>
          </IconButton>

          <IconButton
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('ROTATED_CCW')}
          >
            <Tooltip label="Rotate">
              <RotateCounterClockwiseIcon />
            </Tooltip>
          </IconButton>

          <IconButton
            bp={{ '@initial': 'mobile', '@sm': 'small' }}
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('TOGGLED_SHAPE_HIDE')}
          >
            <Tooltip label="Toogle Hidden">
              {isAllHidden ? <EyeClosedIcon /> : <EyeOpenIcon />}
            </Tooltip>
          </IconButton>

          <IconButton
            bp={{ '@initial': 'mobile', '@sm': 'small' }}
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('TOGGLED_SHAPE_LOCK')}
          >
            <Tooltip label="Toogle Locked">
              {isAllLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
            </Tooltip>
          </IconButton>

          <IconButton
            bp={{ '@initial': 'mobile', '@sm': 'small' }}
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('TOGGLED_SHAPE_ASPECT_LOCK')}
          >
            <Tooltip label="Toogle Aspect Ratio Lock">
              {isAllAspectLocked ? <AspectRatioIcon /> : <BoxIcon />}
            </Tooltip>
          </IconButton>
        </ButtonsRow>
        <ButtonsRow>
          <IconButton
            bp={{ '@initial': 'mobile', '@sm': 'small' }}
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('MOVED', { type: MoveType.ToBack })}
          >
            <Tooltip label="Move to Back">
              <PinBottomIcon />
            </Tooltip>
          </IconButton>

          <IconButton
            bp={{ '@initial': 'mobile', '@sm': 'small' }}
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('MOVED', { type: MoveType.Backward })}
          >
            <Tooltip label="Move Backward">
              <ArrowDownIcon />
            </Tooltip>
          </IconButton>

          <IconButton
            bp={{ '@initial': 'mobile', '@sm': 'small' }}
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('MOVED', { type: MoveType.Forward })}
          >
            <Tooltip label="Move Forward">
              <ArrowUpIcon />
            </Tooltip>
          </IconButton>

          <IconButton
            bp={{ '@initial': 'mobile', '@sm': 'small' }}
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('MOVED', { type: MoveType.ToFront })}
          >
            <Tooltip label="More to Front">
              <PinTopIcon />
            </Tooltip>
          </IconButton>

          <IconButton
            bp={{ '@initial': 'mobile', '@sm': 'small' }}
            disabled={!hasSelection}
            size="small"
            onClick={() => state.send('DELETED')}
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
