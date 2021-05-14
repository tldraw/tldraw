import useKeyboardEvents from "hooks/useKeyboardEvents"
import Canvas from "./canvas/canvas"
import StatusBar from "./status-bar"
import CodePanel from "./code-panel/code-panel"

export default function Editor() {
  useKeyboardEvents()

  return (
    <>
      <Canvas />
      <StatusBar />
      {/* <CodePanel /> */}
    </>
  )
}
