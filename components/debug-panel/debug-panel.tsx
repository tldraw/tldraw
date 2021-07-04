/* eslint-disable @typescript-eslint/ban-ts-comment */
import styled from 'styles'
import React, { useRef } from 'react'
import state, { useSelector } from 'state'
import * as Panel from '../panel'
import { breakpoints, IconButton, RowButton, IconWrapper } from '../shared'
import {
  Cross2Icon,
  PlayIcon,
  DotIcon,
  CrumpledPaperIcon,
  StopIcon,
  ClipboardIcon,
  ClipboardCopyIcon,
} from '@radix-ui/react-icons'
import logger from 'state/logger'
import { useStateDesigner } from '@state-designer/react'

const stopPropagation = (e: React.KeyboardEvent) => e.stopPropagation()
const toggleDebugPanel = () => state.send('TOGGLED_DEBUG_PANEL')
const handleStateCopy = () => state.send('COPIED_STATE_TO_CLIPBOARD')

export default function CodePanel(): JSX.Element {
  const rContainer = useRef<HTMLDivElement>(null)
  const isDebugging = useSelector((s) => s.data.settings.isDebugMode)
  const isOpen = useSelector((s) => s.data.settings.isDebugOpen)

  const rTextArea = useRef<HTMLTextAreaElement>(null)

  const local = useStateDesigner({
    initial: 'stopped',
    data: {
      log: '',
    },
    states: {
      stopped: {
        on: {
          CHANGED_LOG: 'setLog',
          COPIED_LOG: { if: 'hasLog', do: 'copyLog' },
          PLAYED_BACK_LOG: { if: 'hasLog', do: 'playbackLog' },
          STARTED_LOGGING: { do: 'startLogger', to: 'logging' },
        },
      },
      logging: {
        on: {
          STOPPED_LOGGING: { do: 'stopLogger', to: 'stopped' },
        },
      },
    },
    conditions: {
      hasLog(data) {
        return data.log !== ''
      },
    },
    actions: {
      setLog(data, payload: { value: string }) {
        data.log = payload.value
      },
      startLogger(data) {
        logger.start(state.data)
        data.log = ''
      },
      stopLogger(data) {
        logger.stop(state.data)
        data.log = logger.copyToJson()
      },
      playbackLog(data) {
        logger.playback(state.data, data.log)
      },
      copyLog() {
        logger.copyToJson()
      },
    },
  })

  if (!isDebugging) return null

  const handleLoggingStop = () => local.send('STOPPED_LOGGING')

  const handlePlayback = () =>
    local.send('PLAYED_BACK_LOG', { log: rTextArea.current?.value })

  const handleLoggingStart = () => local.send('STARTED_LOGGING')

  const handleLoggingCopy = () => local.send('COPIED_DEBUG_LOG')

  return (
    <StylePanelRoot
      dir="ltr"
      bp={breakpoints}
      data-bp-desktop
      ref={rContainer}
      variant="code"
      onWheel={(e) => e.stopPropagation()}
    >
      {isOpen ? (
        <Panel.Layout onKeyDown={stopPropagation}>
          <Panel.Header side="left">
            <IconButton
              bp={breakpoints}
              size="small"
              onClick={toggleDebugPanel}
            >
              <Cross2Icon />
            </IconButton>
            <span>Debugging</span>
            <div />
          </Panel.Header>
          <Panel.Content>
            <hr />
            <RowButton bp={breakpoints} onClick={handleStateCopy}>
              <span>Copy State</span>
              <IconWrapper size="small">
                <ClipboardCopyIcon />
              </IconWrapper>
            </RowButton>
            <hr />
            {local.isIn('stopped') ? (
              <RowButton bp={breakpoints} onClick={handleLoggingStart}>
                <span>Start Logger</span>
                <IconWrapper size="small">
                  <DotIcon />
                </IconWrapper>
              </RowButton>
            ) : (
              <RowButton bp={breakpoints} onClick={handleLoggingStop}>
                <span>Stop Logger</span>
                <IconWrapper size="small">
                  <StopIcon />
                </IconWrapper>
              </RowButton>
            )}
            <JSONTextAreaWrapper>
              <IconButton
                bp={breakpoints}
                onClick={handleLoggingCopy}
                disabled={!local.can('COPIED_LOG')}
                style={{ position: 'absolute', top: 2, right: 2 }}
              >
                <ClipboardIcon />
              </IconButton>
              <JSONTextArea
                ref={rTextArea}
                value={local.data.log}
                onChange={(e) =>
                  local.send('CHANGED_LOG', { value: e.currentTarget.value })
                }
              />
            </JSONTextAreaWrapper>
            <RowButton
              bp={breakpoints}
              onClick={handlePlayback}
              disabled={!local.can('PLAYED_BACK_LOG')}
            >
              <span>Play Back Log</span>
              <IconWrapper size="small">
                <PlayIcon />
              </IconWrapper>
            </RowButton>
          </Panel.Content>
        </Panel.Layout>
      ) : (
        <IconButton bp={breakpoints} size="small" onClick={toggleDebugPanel}>
          <CrumpledPaperIcon />
        </IconButton>
      )}
    </StylePanelRoot>
  )
}

const StylePanelRoot = styled(Panel.Root, {
  marginRight: '8px',
  width: 'fit-content',
  maxWidth: 'fit-content',
  overflow: 'hidden',
  position: 'relative',
  border: '1px solid $panel',
  boxShadow: '0px 2px 4px rgba(0,0,0,.2)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  pointerEvents: 'all',
  padding: 2,

  '& hr': {
    marginTop: 2,
    marginBottom: 2,
    marginLeft: '-2px',
    border: 'none',
    height: 1,
    backgroundColor: '$brushFill',
    width: 'calc(100% + 4px)',
  },
})

const JSONTextAreaWrapper = styled('div', {
  position: 'relative',
  margin: '4px 0',
})

const JSONTextArea = styled('textarea', {
  minHeight: '100px',
  width: '100%',
  font: '$mono',
  backgroundColor: '$panel',
  border: '1px solid $border',
  borderRadius: '4px',
  padding: '4px',
  outline: 'none',
})
