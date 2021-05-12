import styled from "styles"

const Indicator = styled("path", {
  fill: "none",
  stroke: "transparent",
  strokeWidth: "2",
  pointerEvents: "none",
  strokeLineCap: "round",
  strokeLinejoin: "round",
})

const HoverIndicator = styled("path", {
  fill: "none",
  stroke: "transparent",
  strokeWidth: "8",
  pointerEvents: "all",
  strokeLinecap: "round",
  strokeLinejoin: "round",
})

export { Indicator, HoverIndicator }
