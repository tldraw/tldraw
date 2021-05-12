import styled from "styles"

const Indicator = styled("path", {
  fill: "none",
  stroke: "transparent",
  strokeWidth: "max(1, calc(2 / var(--camera-zoom)))",
  pointerEvents: "none",
  strokeLineCap: "round",
  strokeLinejoin: "round",
})

const HoverIndicator = styled("path", {
  fill: "none",
  stroke: "transparent",
  strokeWidth: "max(1, calc(8 / var(--camera-zoom)))",
  pointerEvents: "all",
  strokeLinecap: "round",
  strokeLinejoin: "round",
})

export { Indicator, HoverIndicator }
