import { useStateDesigner } from "@state-designer/react"
import state from "state"
import styled from "styles"
import { useRef } from "react"

export default function StatusBar() {
  const local = useStateDesigner(state)
  const { count, time } = useRenderCount()

  const active = local.active.slice(1).map((s) => s.split("root.")[1])
  const log = local.log[0]

  return (
    <StatusBarContainer>
      <Section>{active.join(" | ")}</Section>
      <Section>| {log}</Section>
      <Section title="Renders | Time">
        {count} | {time.toString().padStart(3, "0")}
      </Section>
    </StatusBarContainer>
  )
}

const StatusBarContainer = styled("div", {
  position: "absolute",
  bottom: 0,
  left: 0,
  width: "100%",
  height: 40,
  userSelect: "none",
  borderTop: "1px solid black",
  gridArea: "status",
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  backgroundColor: "white",
  gap: 8,
  fontSize: "$1",
  padding: "0 16px",
  zIndex: 200,
})

const Section = styled("div", {
  whiteSpace: "nowrap",
  overflow: "hidden",
})

function useRenderCount() {
  const rTime = useRef(Date.now())
  const rCounter = useRef(0)

  rCounter.current++
  const now = Date.now()
  let time = now - rTime.current
  if (time > 100) {
    time = 0
  }
  rTime.current = now

  return { count: rCounter.current, time }
}
