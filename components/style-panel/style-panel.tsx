import styled from "styles"
import state, { useSelector } from "state"
import * as Panel from "components/panel"
import { useRef } from "react"
import { IconButton } from "components/shared"
import { Circle, Square, Trash, X } from "react-feather"
import { deepCompare, deepCompareArrays, getSelectedShapes } from "utils/utils"
import { colors } from "state/data"

import ColorPicker from "./color-picker"
import AlignDistribute from "./align-distribute"
import { ShapeByType, ShapeStyles } from "types"

export default function StylePanel() {
  const rContainer = useRef<HTMLDivElement>(null)
  const isOpen = useSelector((s) => s.data.settings.isStyleOpen)

  return (
    <StylePanelRoot ref={rContainer} isOpen={isOpen}>
      {isOpen ? (
        <SelectedShapeStyles />
      ) : (
        <IconButton onClick={() => state.send("TOGGLED_STYLE_PANEL_OPEN")}>
          <Circle />
        </IconButton>
      )}
    </StylePanelRoot>
  )
}

// This panel is going to be hard to keep cool, as we're selecting computed
// information, based on the user's current selection. We might have to keep
// track of this data manually within our state.

function SelectedShapeStyles({}: {}) {
  const selectedIds = useSelector(
    (s) => Array.from(s.data.selectedIds.values()),
    deepCompareArrays
  )

  const shapesStyle = useSelector((s) => {
    const { currentStyle } = s.data
    const shapes = getSelectedShapes(s.data)

    if (shapes.length === 0) {
      return currentStyle
    }

    const style: Partial<ShapeStyles> = {}
    const overrides = new Set<string>([])

    for (const shape of shapes) {
      for (let key in currentStyle) {
        if (overrides.has(key)) continue
        if (style[key] === undefined) {
          style[key] = shape.style[key]
        } else {
          if (style[key] === shape.style[key]) continue
          style[key] = currentStyle[key]
          overrides.add(key)
        }
      }
    }

    return style
  }, deepCompare)

  return (
    <Panel.Layout>
      <Panel.Header>
        <IconButton onClick={() => state.send("TOGGLED_STYLE_PANEL_OPEN")}>
          <X />
        </IconButton>
        <h3>Style</h3>
        <Panel.ButtonsGroup>
          <IconButton onClick={() => state.send("DELETED")}>
            <Trash />
          </IconButton>
        </Panel.ButtonsGroup>
      </Panel.Header>
      <Content>
        <ColorPicker
          label="Fill"
          color={shapesStyle.fill}
          onChange={(color) => state.send("CHANGED_STYLE", { fill: color })}
        />
        <ColorPicker
          label="Stroke"
          color={shapesStyle.stroke}
          onChange={(color) => state.send("CHANGED_STYLE", { stroke: color })}
        />
        <AlignDistribute />
      </Content>
    </Panel.Layout>
  )
}

const StylePanelRoot = styled(Panel.Root, {
  minWidth: 1,
  width: 184,
  maxWidth: 184,
  position: "relative",

  variants: {
    isOpen: {
      true: {},
      false: {
        height: 34,
        width: 34,
      },
    },
  },
})

const Content = styled(Panel.Content, {
  padding: 8,
})
