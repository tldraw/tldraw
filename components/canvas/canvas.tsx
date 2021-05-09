import styled from "styles"
import { useRef } from "react"
import useZoomEvents from "hooks/useZoomEvents"
import useCamera from "hooks/useCamera"
import Page from "./page"

export default function Canvas() {
  const rCanvas = useRef<SVGSVGElement>(null)
  const rGroup = useRef<SVGGElement>(null)
  const events = useZoomEvents(rCanvas)

  useCamera(rGroup)

  return (
    <MainSVG ref={rCanvas} {...events}>
      <MainGroup ref={rGroup}>
        <Page />
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
