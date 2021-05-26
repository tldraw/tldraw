import styled from "styles"

export const Root = styled("div", {
  position: "relative",
  backgroundColor: "$panel",
  borderRadius: "4px",
  overflow: "hidden",
  border: "1px solid $border",
  pointerEvents: "all",
  userSelect: "none",
  zIndex: 200,
  boxShadow: "0px 2px 25px rgba(0,0,0,.16)",

  variants: {
    isOpen: {
      true: {
        width: "auto",
        minWidth: 300,
      },
      false: {
        height: 34,
        width: 34,
      },
    },
  },
})

export const Layout = styled("div", {
  display: "grid",
  gridTemplateColumns: "1fr",
  gridTemplateRows: "auto 1fr",
  gridAutoRows: "28px",
  height: "100%",
  width: "100%",
  minWidth: "100%",
  maxWidth: 560,
  overflow: "hidden",
  userSelect: "none",
  pointerEvents: "all",
})

export const Header = styled("div", {
  pointerEvents: "all",
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  justifyContent: "center",
  borderBottom: "1px solid $border",

  "& button": {
    gridColumn: "1",
    gridRow: "1",
  },

  "& h3": {
    gridColumn: "1 / span 3",
    gridRow: "1",
    textAlign: "center",
    margin: "0",
    padding: "0",
    fontSize: "13px",
  },
})

export const ButtonsGroup = styled("div", {
  gridRow: "1",
  gridColumn: "3",
  display: "flex",
})

export const Content = styled("div", {
  position: "relative",
  pointerEvents: "all",
  overflowY: "scroll",
})

export const Footer = styled("div", {
  overflowX: "scroll",
  color: "$text",
  font: "$debug",
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
  borderTop: "1px solid $border",
})
