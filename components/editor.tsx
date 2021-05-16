import useKeyboardEvents from "hooks/useKeyboardEvents"
import useLoadOnMount from "hooks/useLoadOnMount"
import Canvas from "./canvas/canvas"
import StatusBar from "./status-bar"
import Toolbar from "./toolbar"
import CodePanel from "./code-panel/code-panel"

export default function Editor() {
  useKeyboardEvents()
  useLoadOnMount()

  return (
    <>
      <Canvas />
      <StatusBar />
      <Toolbar />
      {/* <CodePanel /> */}
    </>
  )
}
