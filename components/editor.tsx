import useKeyboardEvents from "hooks/useKeyboardEvents"
import useLoadOnMount from "hooks/useLoadOnMount"
import Canvas from "./canvas/canvas"
import StatusBar from "./status-bar"
import Toolbar from "./toolbar"
import CodePanel from "./code-panel/code-panel"
import ControlsPanel from "./controls-panel/controls-panel"
import styled from "styles"
import StylePanel from "./style-panel/style-panel"

export default function Editor() {
  useKeyboardEvents()
  useLoadOnMount()

  return (
    <Layout>
      <Canvas />
      <StatusBar />
      <Toolbar />
      <LeftPanels>
        <CodePanel />
        <ControlsPanel />
      </LeftPanels>
      <RightPanels>
        <StylePanel />
      </RightPanels>
    </Layout>
  )
}

const Layout = styled("div", {
  position: "fixed",
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  display: "grid",
  gridTemplateRows: "40px 1fr 40px",
  gridTemplateColumns: "minmax(50%, 400px) 1fr auto",
  gridTemplateAreas: `
    "toolbar toolbar toolbar"
    "leftPanels main rightPanels"
    "statusbar statusbar statusbar"
  `,
})

const LeftPanels = styled("main", {
  display: "grid",
  gridArea: "leftPanels",
  gridTemplateRows: "1fr auto",
  padding: 8,
  gap: 8,
})

const RightPanels = styled("main", {
  display: "grid",
  gridArea: "rightPanels",
  gridTemplateRows: "auto",
  height: "fit-content",
  justifyContent: "flex-end",
  padding: 8,
  gap: 8,
})
