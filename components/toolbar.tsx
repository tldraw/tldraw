import state, { useSelector } from "state"
import styled from "styles"
import { Menu } from "react-feather"

export default function Toolbar() {
  const activeTool = useSelector((state) =>
    state.whenIn({
      selecting: "select",
      dot: "dot",
      circle: "circle",
      ellipse: "ellipse",
      ray: "ray",
      line: "line",
      polyline: "polyline",
      rectangle: "rectangle",
    })
  )

  return (
    <ToolbarContainer>
      <Section>
        <Button>
          <Menu />
        </Button>
        <Button
          isSelected={activeTool === "select"}
          onClick={() => state.send("SELECTED_SELECT_TOOL")}
        >
          Select
        </Button>
        <Button
          isSelected={activeTool === "dot"}
          onClick={() => state.send("SELECTED_DOT_TOOL")}
        >
          Dot
        </Button>
        <Button
          isSelected={activeTool === "circle"}
          onClick={() => state.send("SELECTED_CIRCLE_TOOL")}
        >
          Circle
        </Button>
        <Button
          isSelected={activeTool === "ellipse"}
          onClick={() => state.send("SELECTED_ELLIPSE_TOOL")}
        >
          Ellipse
        </Button>
        <Button
          isSelected={activeTool === "ray"}
          onClick={() => state.send("SELECTED_RAY_TOOL")}
        >
          Ray
        </Button>
        <Button
          isSelected={activeTool === "line"}
          onClick={() => state.send("SELECTED_LINE_TOOL")}
        >
          Line
        </Button>
        <Button
          isSelected={activeTool === "polyline"}
          onClick={() => state.send("SELECTED_POLYLINE_TOOL")}
        >
          Polyline
        </Button>
        <Button
          isSelected={activeTool === "rectangle"}
          onClick={() => state.send("SELECTED_RECTANGLE_TOOL")}
        >
          Rectangle
        </Button>
      </Section>
    </ToolbarContainer>
  )
}

const ToolbarContainer = styled("div", {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: 40,
  userSelect: "none",
  borderBottom: "1px solid black",
  gridArea: "status",
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  backgroundColor: "white",
  gap: 8,
  fontSize: "$1",
  zIndex: 200,
})

const Section = styled("div", {
  whiteSpace: "nowrap",
  overflow: "hidden",
  display: "flex",
})

const Button = styled("button", {
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  font: "$ui",
  fontSize: "$ui",
  height: "40px",
  borderRadius: 0,
  border: "none",
  padding: "0 12px",
  background: "none",
  "&:hover": {
    backgroundColor: "$hint",
  },
  "& svg": {
    height: 16,
    width: 16,
  },
  variants: {
    isSelected: {
      true: {
        color: "$selected",
      },
      false: {},
    },
  },
})
