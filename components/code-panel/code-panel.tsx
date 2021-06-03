/* eslint-disable @typescript-eslint/ban-ts-comment */
import styled from 'styles'
import { useStateDesigner } from '@state-designer/react'
import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import state, { useSelector } from 'state'
import { CodeFile } from 'types'
import CodeDocs from './code-docs'
import CodeEditor from './code-editor'
import { generateFromCode } from 'lib/code/generate'
import * as Panel from '../panel'
import { IconButton } from '../shared'
import {
  X,
  Code,
  Info,
  PlayCircle,
  ChevronUp,
  ChevronDown,
} from 'react-feather'

const getErrorLineAndColumn = (e: any) => {
  if ('line' in e) {
    return { line: Number(e.line), column: e.column }
  }

  const result = e.stack.match(/:([0-9]+):([0-9]+)/)
  if (result) {
    return { line: Number(result[1]) - 1, column: result[2] }
  }
}

export default function CodePanel() {
  const rContainer = useRef<HTMLDivElement>(null)
  const isReadOnly = useSelector((s) => s.data.isReadOnly)
  const fileId = useSelector((s) => s.data.currentCodeFileId)
  const file = useSelector(
    (s) => s.data.document.code[s.data.currentCodeFileId]
  )
  const isOpen = useSelector((s) => s.data.settings.isCodeOpen)
  const fontSize = useSelector((s) => s.data.settings.fontSize)

  const local = useStateDesigner({
    data: {
      code: file.code,
      error: null as { message: string; line: number; column: number } | null,
    },
    on: {
      MOUNTED: 'setCode',
      CHANGED_FILE: 'loadFile',
    },
    initial: 'editingCode',
    states: {
      editingCode: {
        on: {
          RAN_CODE: ['saveCode', 'runCode'],
          SAVED_CODE: ['saveCode', 'runCode'],
          CHANGED_CODE: { secretlyDo: 'setCode' },
          CLEARED_ERROR: { if: 'hasError', do: 'clearError' },
          TOGGLED_DOCS: { to: 'viewingDocs' },
        },
      },
      viewingDocs: {
        on: {
          TOGGLED_DOCS: { to: 'editingCode' },
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

        try {
          const { shapes, controls } = generateFromCode(data.code)
          state.send('GENERATED_FROM_CODE', { shapes, controls })
        } catch (e) {
          console.error(e)
          error = { message: e.message, ...getErrorLineAndColumn(e) }
        }

        data.error = error
      },
      saveCode(data) {
        const { code } = data
        state.send('SAVED_CODE', { code })
      },
      clearError(data) {
        data.error = null
      },
    },
  })

  useEffect(() => {
    local.send('CHANGED_FILE', { file })
  }, [file])

  useEffect(() => {
    local.send('MOUNTED', { code: state.data.document.code[fileId].code })
    return () => {
      state.send('CHANGED_CODE', { fileId, code: local.data.code })
    }
  }, [])

  const { error } = local.data

  return (
    <Panel.Root
      bp={{ '@initial': 'mobile', '@sm': 'small' }}
      data-bp-desktop
      ref={rContainer}
      isOpen={isOpen}
      variant="code"
    >
      {isOpen ? (
        <Panel.Layout>
          <Panel.Header side="left">
            <IconButton
              bp={{ '@initial': 'mobile', '@sm': 'small' }}
              size="small"
              onClick={() => state.send('TOGGLED_CODE_PANEL_OPEN')}
            >
              <X />
            </IconButton>
            <h3>Code</h3>
            <ButtonsGroup>
              <FontSizeButtons>
                <IconButton
                  bp={{ '@initial': 'mobile', '@sm': 'small' }}
                  size="small"
                  disabled={!local.isIn('editingCode')}
                  onClick={() => state.send('INCREASED_CODE_FONT_SIZE')}
                >
                  <ChevronUp />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={!local.isIn('editingCode')}
                  onClick={() => state.send('DECREASED_CODE_FONT_SIZE')}
                >
                  <ChevronDown />
                </IconButton>
              </FontSizeButtons>
              <IconButton
                bp={{ '@initial': 'mobile', '@sm': 'small' }}
                size="small"
                onClick={() => local.send('TOGGLED_DOCS')}
              >
                <Info />
              </IconButton>
              <IconButton
                bp={{ '@initial': 'mobile', '@sm': 'small' }}
                size="small"
                disabled={!local.isIn('editingCode')}
                onClick={() => local.send('SAVED_CODE')}
              >
                <PlayCircle />
              </IconButton>
            </ButtonsGroup>
          </Panel.Header>
          <Panel.Content>
            <CodeEditor
              fontSize={fontSize}
              readOnly={isReadOnly}
              value={file.code}
              error={error}
              onChange={(code) => local.send('CHANGED_CODE', { code })}
              onSave={() => local.send('SAVED_CODE')}
              onKey={() => local.send('CLEARED_ERROR')}
            />
            <CodeDocs isHidden={!local.isIn('viewingDocs')} />
          </Panel.Content>
          <Panel.Footer>
            {error &&
              (error.line
                ? `(${Number(error.line) - 2}:${error.column}) ${error.message}`
                : error.message)}
          </Panel.Footer>
        </Panel.Layout>
      ) : (
        <IconButton
          bp={{ '@initial': 'mobile', '@sm': 'small' }}
          size="small"
          onClick={() => state.send('TOGGLED_CODE_PANEL_OPEN')}
        >
          <Code />
        </IconButton>
      )}
    </Panel.Root>
  )
}

const ButtonsGroup = styled('div', {
  gridRow: '1',
  gridColumn: '3',
  display: 'flex',
})

const FontSizeButtons = styled('div', {
  paddingRight: 4,
  display: 'flex',
  flexDirection: 'column',

  '& > button': {
    height: '50%',
    '&:nth-of-type(1)': {
      alignItems: 'flex-end',
    },

    '&:nth-of-type(2)': {
      alignItems: 'flex-start',
    },

    '& svg': {
      height: 12,
    },
  },
})
