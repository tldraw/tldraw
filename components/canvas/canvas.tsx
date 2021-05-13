import styled from "styles"
import React, { useCallback, useRef } from "react"
import useZoomEvents from "hooks/useZoomEvents"
import useCamera from "hooks/useCamera"
import Page from "./page"
import Brush from "./brush"
import state from "state"
import Bounds from "./bounds"
import BoundsBg from "./bounds-bg"
import inputs from "state/inputs"

export default function Canvas() {
  const rCanvas = useRef<SVGSVGElement>(null)
  const rGroup = useRef<SVGGElement>(null)
  const events = useZoomEvents(rCanvas)

  useCamera(rGroup)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    rCanvas.current.setPointerCapture(e.pointerId)
    state.send("POINTED_CANVAS", inputs.pointerDown(e))
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    state.send("MOVED_POINTER", inputs.pointerMove(e))
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    rCanvas.current.releasePointerCapture(e.pointerId)
    state.send("STOPPED_POINTING", { id: "canvas", ...inputs.pointerUp(e) })
  }, [])

  return (
    <MainSVG
      ref={rCanvas}
      {...events}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <MainGroup ref={rGroup}>
        <BoundsBg />
        <Page />
        <Bounds />
        <Brush />
      </MainGroup>
    </MainSVG>
  )
}

const MainSVG = styled("svg", {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  touchAction: "none",
  zIndex: 100,
})

const MainGroup = styled("g", {})
