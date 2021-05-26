import {
  AlignBottomIcon,
  AlignCenterHorizontallyIcon,
  AlignCenterVerticallyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
  SpaceEvenlyHorizontallyIcon,
  SpaceEvenlyVerticallyIcon,
  StretchHorizontallyIcon,
  StretchVerticallyIcon,
} from "@radix-ui/react-icons"
import { IconButton } from "components/shared"
import state from "state"
import styled from "styles"
import { AlignType, DistributeType, StretchType } from "types"

function alignTop() {
  state.send("ALIGNED", { type: AlignType.Top })
}

function alignCenterVertical() {
  state.send("ALIGNED", { type: AlignType.CenterVertical })
}

function alignBottom() {
  state.send("ALIGNED", { type: AlignType.Bottom })
}

function stretchVertically() {
  state.send("STRETCHED", { type: StretchType.Vertical })
}

function distributeVertically() {
  state.send("DISTRIBUTED", { type: DistributeType.Vertical })
}

function alignLeft() {
  state.send("ALIGNED", { type: AlignType.Left })
}

function alignCenterHorizontal() {
  state.send("ALIGNED", { type: AlignType.CenterHorizontal })
}

function alignRight() {
  state.send("ALIGNED", { type: AlignType.Right })
}

function stretchHorizontally() {
  state.send("STRETCHED", { type: StretchType.Horizontal })
}

function distributeHorizontally() {
  state.send("DISTRIBUTED", { type: DistributeType.Horizontal })
}

export default function AlignDistribute() {
  return (
    <Container>
      <IconButton onClick={alignTop}>
        <AlignTopIcon />
      </IconButton>
      <IconButton onClick={alignCenterVertical}>
        <AlignCenterVerticallyIcon />
      </IconButton>
      <IconButton onClick={alignBottom}>
        <AlignBottomIcon />
      </IconButton>
      <IconButton onClick={stretchVertically}>
        <StretchVerticallyIcon />
      </IconButton>
      <IconButton onClick={distributeVertically}>
        <SpaceEvenlyVerticallyIcon />
      </IconButton>
      <IconButton onClick={alignLeft}>
        <AlignLeftIcon />
      </IconButton>
      <IconButton onClick={alignCenterHorizontal}>
        <AlignCenterHorizontallyIcon />
      </IconButton>
      <IconButton onClick={alignRight}>
        <AlignRightIcon />
      </IconButton>
      <IconButton onClick={stretchHorizontally}>
        <StretchHorizontallyIcon />
      </IconButton>
      <IconButton onClick={distributeHorizontally}>
        <SpaceEvenlyHorizontallyIcon />
      </IconButton>
    </Container>
  )
}

const Container = styled("div", {
  display: "grid",
  padding: 4,
  gridTemplateColumns: "repeat(5, auto)",
  [`& ${IconButton}`]: {
    color: "$text",
  },
  [`& ${IconButton} > svg`]: {
    fill: "red",
    stroke: "transparent",
  },
})
