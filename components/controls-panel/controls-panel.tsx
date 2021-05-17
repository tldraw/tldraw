/* eslint-disable @typescript-eslint/ban-ts-comment */
import styled from "styles"
import React, { useEffect, useRef } from "react"
import state, { useSelector } from "state"
import { X, Code, PlayCircle } from "react-feather"
import { IconButton } from "components/shared"
import * as Panel from "../panel"
import Control from "./control"
import { deepCompareArrays } from "utils/utils"

export default function ControlPanel() {
  const rContainer = useRef<HTMLDivElement>(null)
  const codeControls = useSelector(
    (state) => Object.keys(state.data.codeControls),
    deepCompareArrays
  )
  const isOpen = true

  return (
    <Panel.Root data-bp-desktop ref={rContainer} isCollapsed={!isOpen}>
      {isOpen ? (
        <Panel.Layout>
          <Panel.Header>
            <IconButton onClick={() => state.send("CLOSED_CODE_PANEL")}>
              <X />
            </IconButton>
            <h3>Controls</h3>
          </Panel.Header>
          <ControlsList>
            {codeControls.map((id) => (
              <Control key={id} id={id} />
            ))}
          </ControlsList>
        </Panel.Layout>
      ) : (
        <IconButton onClick={() => state.send("OPENED_CODE_PANEL")}>
          <Code />
        </IconButton>
      )}
    </Panel.Root>
  )
}

const ControlsList = styled(Panel.Content, {
  padding: 12,
  display: "grid",
  gridTemplateColumns: "1fr 4fr",
  gridAutoRows: "24px",
  alignItems: "center",
  gridColumnGap: "8px",
  gridRowGap: "8px",

  "& input": {
    font: "$ui",
    fontSize: "$1",
    border: "1px solid $inputBorder",
    backgroundColor: "$input",
    color: "$text",
    height: "100%",
    padding: "0px 6px",
  },
})
