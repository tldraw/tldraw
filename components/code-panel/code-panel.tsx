/* eslint-disable @typescript-eslint/ban-ts-comment */
import styled from 'styles'
import { useStateDesigner } from '@state-designer/react'
import React, { useCallback, useEffect, useRef } from 'react'
import state, { useSelector } from 'state'
import { CodeError, CodeFile, CodeResult } from 'types'
import CodeDocs from './code-docs'
import { generateFromCode } from 'state/code/generate'
import * as Panel from '../panel'
import { breakpoints, IconButton } from '../shared'
import {
  Cross2Icon,
  CodeIcon,
  PlayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@radix-ui/react-icons'
import dynamic from 'next/dynamic'
import { ReaderIcon } from '@radix-ui/react-icons'
const CodeEditor = dynamic(() => import('./code-editor'))

const increaseCodeSize = () => state.send('INCREASED_CODE_FONT_SIZE')
const decreaseCodeSize = () => state.send('DECREASED_CODE_FONT_SIZE')
const toggleCodePanel = () => state.send('TOGGLED_CODE_PANEL_OPEN')
const handleWheel = (e: React.WheelEvent) => e.stopPropagation()

export default function CodePanel(): JSX.Element {
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
      error: null as CodeError | null,
    },
    on: {
      MOUNTED: 'setCode',
      CHANGED_FILE: 'loadFile',
    },
    initial: 'editingCode',
    states: {
      editingCode: {
        on: {
          RAN_CODE: { do: 'saveCode', to: 'evaluatingCode' },
          SAVED_CODE: { do: 'saveCode', to: 'evaluatingCode' },
          CHANGED_CODE: { secretlyDo: 'setCode' },
          CLEARED_ERROR: { if: 'hasError', do: 'clearError' },
          TOGGLED_DOCS: { to: 'viewingDocs' },
        },
      },
      evaluatingCode: {
        async: {
          await: 'evalCode',
          onResolve: {
            do: ['clearError', 'sendResultToGlobalState'],
            to: 'editingCode',
          },
          onReject: { do: 'setErrorFromResult', to: 'editingCode' },
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
      saveCode(data) {
        const { code } = data
        state.send('SAVED_CODE', { code })
      },
      clearError(data) {
        data.error = null
      },
      setErrorFromResult(data, payload, result: CodeResult) {
        data.error = result.error
      },
      sendResultToGlobalState(data, payload, result: CodeResult) {
        state.send('GENERATED_FROM_CODE', result)
      },
    },
    asyncs: {
      evalCode(data) {
        return new Promise((resolve, reject) => {
          generateFromCode(state.data, data.code).then((result) => {
            if (result.error !== null) {
              reject(result)
            } else {
              resolve(result)
            }
          })
        })
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

  const handleCodeChange = useCallback(
    (code: string) => local.send('CHANGED_CODE', { code }),
    [local]
  )

  const handleSave = useCallback(() => local.send('SAVED_CODE'), [local])

  const handleKey = useCallback(() => local.send('CLEARED_ERROR'), [local])

  const toggleDocs = useCallback(() => local.send('TOGGLED_DOCS'), [local])

  const { error } = local.data

  return (
    <Panel.Root
      dir="ltr"
      bp={breakpoints}
      data-bp-desktop
      ref={rContainer}
      isOpen={isOpen}
      variant="code"
      onWheel={handleWheel}
    >
      {isOpen ? (
        <Panel.Layout>
          <Panel.Header side="left">
            <IconButton bp={breakpoints} size="small" onClick={toggleCodePanel}>
              <Cross2Icon />
            </IconButton>
            <h3>Code</h3>
            <ButtonsGroup>
              <FontSizeButtons>
                <IconButton
                  bp={breakpoints}
                  size="small"
                  disabled={!local.isIn('editingCode')}
                  onClick={increaseCodeSize}
                >
                  <ChevronUpIcon />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={!local.isIn('editingCode')}
                  onClick={decreaseCodeSize}
                >
                  <ChevronDownIcon />
                </IconButton>
              </FontSizeButtons>
              <IconButton bp={breakpoints} size="small" onClick={toggleDocs}>
                <ReaderIcon />
              </IconButton>
              <IconButton
                bp={breakpoints}
                size="small"
                disabled={!local.isIn('editingCode')}
                onClick={handleSave}
              >
                <PlayIcon />
              </IconButton>
            </ButtonsGroup>
          </Panel.Header>
          <Panel.Content>
            <CodeEditor
              fontSize={fontSize}
              readOnly={isReadOnly}
              value={file.code}
              error={error}
              onChange={handleCodeChange}
              onSave={handleSave}
              onKey={handleKey}
            />
            <CodeDocs isHidden={!local.isIn('viewingDocs')} />
          </Panel.Content>

          {error && <Panel.Footer>{error.message}</Panel.Footer>}
        </Panel.Layout>
      ) : (
        <IconButton bp={breakpoints} size="small" onClick={toggleCodePanel}>
          <CodeIcon />
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
