import styled from "styles"
import { useRef } from "react"
import useZoomEvents from "hooks/useZoomEvents"
import useZoomPanEffect from "hooks/useZoomPanEffect"

export default function Canvas() {
  const rCanvas = useRef<SVGSVGElement>(null)
  const rGroup = useRef<SVGGElement>(null)
  const events = useZoomEvents(rCanvas)

  useZoomPanEffect(rGroup)

  return (
    <MainSVG ref={rCanvas} {...events}>
      <MainGroup ref={rGroup}>
        <circle cx={100} cy={100} r={50} />
        <circle cx={500} cy={500} r={200} />
        <circle cx={200} cy={800} r={100} />
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
