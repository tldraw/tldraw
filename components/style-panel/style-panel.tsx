import styled from 'styles'
import state, { useSelector } from 'state'
import * as Panel from 'components/panel'
import { useRef } from 'react'
import { IconButton } from 'components/shared'
import { ChevronDown, X } from 'react-feather'
import ShapesFunctions from './shapes-functions'
import AlignDistribute from './align-distribute'
import SizePicker from './size-picker'
import DashPicker from './dash-picker'
import QuickColorSelect from './quick-color-select'
import ColorPicker from './color-picker'
import IsFilledPicker from './is-filled-picker'
import QuickSizeSelect from './quick-size-select'
import QuickdashSelect from './quick-dash-select'
import Tooltip from 'components/tooltip'

const breakpoints = { '@initial': 'mobile', '@sm': 'small' } as any

const handleStylePanelOpen = () => state.send('TOGGLED_STYLE_PANEL_OPEN')

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
  const selectedShapesCount = useSelector((s) => s.values.selectedIds.length)

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
        <ColorPicker />
        <IsFilledPicker />
        <Row>
          <label htmlFor="size">Size</label>
          <SizePicker />
        </Row>
        <Row>
          <label htmlFor="dash">Dash</label>
          <DashPicker />
        </Row>
        <ShapesFunctions />
        <AlignDistribute
          hasTwoOrMore={selectedShapesCount > 1}
          hasThreeOrMore={selectedShapesCount > 2}
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
    fontWeight: 400,
    fontSize: '$1',
    margin: 0,
    padding: 0,
  },

  '& > svg': {
    position: 'relative',
  },
})
