import useKeyboardEvents from "hooks/useKeyboardEvents"
import Canvas from "./canvas/canvas"
import StatusBar from "./status-bar"

export default function Editor() {
  useKeyboardEvents()

  return (
    <>
      <Canvas />
      <StatusBar />
    </>
  )
}
