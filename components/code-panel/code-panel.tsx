/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useEffect, useRef } from "react"
import state, { useSelector } from "state"
import { motion } from "framer-motion"
import { CodeFile } from "types"
import { useStateDesigner } from "@state-designer/react"
import CodeDocs from "./code-docs"
import CodeEditor from "./code-editor"
import {
  X,
  Code,
  Info,
  PlayCircle,
  ChevronUp,
  ChevronDown,
} from "react-feather"
import styled from "styles"

// import evalCode from "lib/code"

const getErrorLineAndColumn = (e: any) => {
  if ("line" in e) {
    return { line: Number(e.line), column: e.column }
  }

  const result = e.stack.match(/:([0-9]+):([0-9]+)/)
  if (result) {
    return { line: Number(result[1]) - 1, column: result[2] }
  }
}

export default function CodePanel() {
  const rContainer = useRef<HTMLDivElement>(null)

  const fileId = "file0"
  const isReadOnly = useSelector((s) => s.data.isReadOnly)
  const file = useSelector((s) => s.data.document.code[fileId])
  const isOpen = true
  const fontSize = useSelector((s) => s.data.settings.fontSize)

  const local = useStateDesigner({
    data: {
      code: file.code,
      error: null as { message: string; line: number; column: number } | null,
    },
    on: {
      MOUNTED: "setCode",
      CHANGED_FILE: "loadFile",
    },
    initial: "editingCode",
    states: {
      editingCode: {
        on: {
          RAN_CODE: "runCode",
          SAVED_CODE: ["runCode", "saveCode"],
          CHANGED_CODE: [{ secretlyDo: "setCode" }],
          CLEARED_ERROR: { if: "hasError", do: "clearError" },
          TOGGLED_DOCS: { to: "viewingDocs" },
        },
      },
      viewingDocs: {
        on: {
          TOGGLED_DOCS: { to: "editingCode" },
        },
      },
    },
    conditions: {
      hasError(data) {
        return !!data.error
      },
    },
    actions: {
      loadFile(data, payload: { file: CodeFile }) {
        data.code = payload.file.code
      },
      setCode(data, payload: { code: string }) {
        data.code = payload.code
      },
      runCode(data) {
        let error = null

        // try {
        //   const { nodes, globs } = evalCode(data.code)
        //   state.send("GENERATED_ITEMS", { nodes, globs })
        // } catch (e) {
        //   error = { message: e.message, ...getErrorLineAndColumn(e) }
        // }

        data.error = error
      },
      saveCode(data) {
        state.send("CHANGED_CODE", { fileId, code: data.code })
      },
      clearError(data) {
        data.error = null
      },
    },
  })

  useEffect(() => {
    local.send("CHANGED_FILE", { file })
  }, [file])

  useEffect(() => {
    local.send("MOUNTED", { code: state.data.document.code[fileId].code })
    return () => {
      state.send("CHANGED_CODE", { fileId, code: local.data.code })
    }
  }, [])

  const { error } = local.data

  return (
    <PanelContainer
      data-bp-desktop
      ref={rContainer}
      dragMomentum={false}
      isCollapsed={!isOpen}
    >
      {isOpen ? (
        <Content>
          <Header>
            <IconButton onClick={() => state.send("CLOSED_CODE_PANEL")}>
              <X />
            </IconButton>
            <h3>Code</h3>
            <ButtonsGroup>
              <FontSizeButtons>
                <IconButton
                  disabled={!local.isIn("editingCode")}
                  onClick={() => state.send("INCREASED_CODE_FONT_SIZE")}
                >
                  <ChevronUp />
                </IconButton>
                <IconButton
                  disabled={!local.isIn("editingCode")}
                  onClick={() => state.send("DECREASED_CODE_FONT_SIZE")}
                >
                  <ChevronDown />
                </IconButton>
              </FontSizeButtons>
              <IconButton onClick={() => local.send("TOGGLED_DOCS")}>
                <Info />
              </IconButton>
              <IconButton
                disabled={!local.isIn("editingCode")}
                onClick={() => local.send("SAVED_CODE")}
              >
                <PlayCircle />
              </IconButton>
            </ButtonsGroup>
          </Header>
          <EditorContainer>
            <CodeEditor
              fontSize={fontSize}
              readOnly={isReadOnly}
              value={file.code}
              error={error}
              onChange={(code) => local.send("CHANGED_CODE", { code })}
              onSave={() => local.send("SAVED_CODE")}
              onKey={() => local.send("CLEARED_ERROR")}
            />
            <CodeDocs isHidden={!local.isIn("viewingDocs")} />
          </EditorContainer>
          <ErrorContainer>
            {error &&
              (error.line
                ? `(${Number(error.line) - 2}:${error.column}) ${error.message}`
                : error.message)}
          </ErrorContainer>
        </Content>
      ) : (
        <IconButton onClick={() => state.send("OPENED_CODE_PANEL")}>
          <Code />
        </IconButton>
      )}
    </PanelContainer>
  )
}

const PanelContainer = styled(motion.div, {
  position: "absolute",
  top: "8px",
  right: "8px",
  bottom: "8px",
  backgroundColor: "$panel",
  borderRadius: "4px",
  overflow: "hidden",
  border: "1px solid $border",
  pointerEvents: "all",
  userSelect: "none",
  zIndex: 200,

  button: {
    border: "none",
  },

  variants: {
    isCollapsed: {
      true: {},
      false: {
        height: "400px",
      },
    },
  },
})

const IconButton = styled("button", {
  height: "40px",
  width: "40px",
  backgroundColor: "$panel",
  borderRadius: "4px",
  border: "1px solid $border",
  padding: "0",
  margin: "0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  outline: "none",
  pointerEvents: "all",
  cursor: "pointer",

  "&:hover:not(:disabled)": {
    backgroundColor: "$panel",
  },

  "&:disabled": {
    opacity: "0.5",
  },

  svg: {
    height: "20px",
    width: "20px",
    strokeWidth: "2px",
    stroke: "$text",
  },
})

const Content = styled("div", {
  display: "grid",
  gridTemplateColumns: "1fr",
  gridTemplateRows: "auto 1fr 28px",
  minWidth: "100%",
  width: 560,
  maxWidth: 560,
  overflow: "hidden",
  height: "100%",
  userSelect: "none",
  pointerEvents: "all",
})

const Header = styled("div", {
  pointerEvents: "all",
  display: "grid",
  gridTemplateColumns: "auto 1fr",
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
    fontSize: "16px",
  },
})

const ButtonsGroup = styled("div", {
  gridRow: "1",
  gridColumn: "3",
  display: "flex",
})

const EditorContainer = styled("div", {
  position: "relative",
  pointerEvents: "all",
  overflowY: "scroll",
})

const ErrorContainer = styled("div", {
  overflowX: "scroll",
  color: "$text",
  font: "$debug",
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
})

const FontSizeButtons = styled("div", {
  paddingRight: 4,

  "& > button": {
    height: "50%",
    width: "100%",

    "&:nth-of-type(1)": {
      paddingTop: 4,
    },

    "&:nth-of-type(2)": {
      paddingBottom: 4,
    },

    "& svg": {
      height: 12,
    },
  },
})
