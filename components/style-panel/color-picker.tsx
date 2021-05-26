import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Square } from "react-feather"
import styled from "styles"

interface Props {
  label: string
  color: string
  colors: Record<string, string>
  onChange: (color: string) => void
}

export default function ColorPicker({ label, color, colors, onChange }: Props) {
  return (
    <DropdownMenu.Root>
      <CurrentColor>
        <h3>{label}</h3>
        <ColorIcon color={color} />
      </CurrentColor>
      <Colors sideOffset={4}>
        {Object.entries(colors).map(([name, color]) => (
          <ColorButton key={name} title={name} onSelect={() => onChange(color)}>
            <ColorIcon color={color} />
          </ColorButton>
        ))}
      </Colors>
    </DropdownMenu.Root>
  )
}

function ColorIcon({ color }: { color: string }) {
  return (
    <Square
      fill={color}
      strokeDasharray={color === "transparent" ? "2, 3" : "none"}
    />
  )
}

const Colors = styled(DropdownMenu.Content, {
  display: "grid",
  padding: 4,
  gridTemplateColumns: "repeat(6, 1fr)",
  border: "1px solid $border",
  backgroundColor: "$panel",
  borderRadius: 4,
  boxShadow: "0px 5px 15px -5px hsla(206,22%,7%,.15)",
})

const ColorButton = styled(DropdownMenu.Item, {
  position: "relative",
  cursor: "pointer",
  height: 32,
  width: 32,
  border: "none",
  padding: "none",
  background: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  "&::before": {
    content: "''",
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    pointerEvents: "none",
    zIndex: 0,
  },

  "&:hover::before": {
    backgroundColor: "$hover",
    borderRadius: 4,
  },

  "& svg": {
    position: "relative",
    stroke: "rgba(0,0,0,.2)",
    strokeWidth: 1,
    zIndex: 1,
  },
})

const CurrentColor = styled(DropdownMenu.Trigger, {
  position: "relative",
  display: "flex",
  width: "100%",
  background: "none",
  border: "none",
  cursor: "pointer",
  outline: "none",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "4px 6px 4px 12px",

  "&::before": {
    content: "''",
    position: "absolute",
    top: 0,
    left: 4,
    right: 4,
    bottom: 0,
    pointerEvents: "none",
    zIndex: -1,
  },

  "&:hover::before": {
    backgroundColor: "$hover",
    borderRadius: 4,
  },

  "& h3": {
    fontFamily: "$ui",
    fontSize: "$2",
    fontWeight: "$1",
    margin: 0,
    padding: 0,
  },

  "& svg": {
    position: "relative",
    stroke: "rgba(0,0,0,.2)",
    strokeWidth: 1,
    zIndex: 1,
  },
})
