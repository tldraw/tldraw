import * as React from 'react'
import { CursorArrowIcon, LockClosedIcon, LockOpen1Icon } from '@radix-ui/react-icons'
import css from '~styles'
import type { Data } from '~types'
import { useTLDrawContext } from '~hooks'
import { floatingContainer } from '~components/shared'
import { StatusBar } from '~components/tools-panel/status-bar'
import { SecondaryButton } from '~components/tools-panel/styled'
import { UndoRedo } from '~components/tools-panel/undo-redo'
import { Zoom } from '~components/tools-panel/zoom'
import { BackToContent } from '~components/tools-panel/back-to-content'
import { PrimaryTools } from '~components/tools-panel/primary-tools'

const activeToolSelector = (s: Data) => s.appState.activeTool
const isToolLockedSelector = (s: Data) => s.appState.isToolLocked
const isDebugModeSelector = (s: Data) => s.settings.isDebugMode

export const ToolsPanel = React.memo((): JSX.Element => {
  const { tlstate, useSelector } = useTLDrawContext()

  const activeTool = useSelector(activeToolSelector)

  const isToolLocked = useSelector(isToolLockedSelector)

  const isDebugMode = useSelector(isDebugModeSelector)

  const selectSelectTool = React.useCallback(() => {
    tlstate.selectTool('select')
  }, [tlstate])

  return (
    <div className={toolsPanelContainer()}>
      <div className={leftWrap({ size: { '@initial': 'mobile', '@sm': 'small' } })}>
        <Zoom />
        <div className={floatingContainer()}>
          <SecondaryButton
            label={'Select'}
            kbd={'1'}
            onClick={selectSelectTool}
            isActive={activeTool === 'select'}
          >
            <CursorArrowIcon />
          </SecondaryButton>
        </div>
      </div>
      <div className={centerWrap()}>
        <BackToContent />
        <PrimaryTools />
      </div>
      <div
        className={rightWrap({ size: { '@initial': 'mobile', '@micro': 'micro', '@sm': 'small' } })}
      >
        <div className={floatingContainer()}>
          <SecondaryButton
            kbd={'7'}
            label={'Lock Tool'}
            onClick={tlstate.toggleToolLock}
            isActive={isToolLocked}
          >
            {isToolLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
          </SecondaryButton>
        </div>
        <UndoRedo />
      </div>
      {isDebugMode && (
        <div className={statusWrap()}>
          <StatusBar />
        </div>
      )}
    </div>
  )
})

const toolsPanelContainer = css({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  gridTemplateRows: 'auto auto',
  padding: '0',
  alignItems: 'flex-end',
  zIndex: 200,
  gridGap: '$4',
  gridRowGap: '$4',
  pointerEvents: 'none',
  '& > div > *': {
    pointerEvents: 'all',
  },
})

const centerWrap = css({
  gridRow: 1,
  gridColumn: 2,
  display: 'flex',
  width: 'fit-content',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: 12,
})

const leftWrap = css({
  gridRow: 1,
  gridColumn: 1,
  display: 'flex',
  paddingLeft: '$3',
  variants: {
    size: {
      mobile: {
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        '& > *:nth-of-type(1)': {
          marginBottom: '8px',
        },
      },
      small: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        '& > *:nth-of-type(1)': {
          marginBottom: '0px',
        },
      },
    },
  },
})

const rightWrap = css({
  gridRow: 1,
  gridColumn: 3,
  display: 'flex',
  paddingRight: '$3',
  opacity: 1,
  variants: {
    size: {
      micro: {
        opacity: 0,
      },
      mobile: {
        flexDirection: 'column-reverse',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        '& > *:nth-of-type(2)': {
          marginBottom: '8px',
        },
        opacity: 1,
      },
      small: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        '& > *:nth-of-type(2)': {
          marginBottom: '0px',
        },
        opacity: 1,
      },
    },
  },
})

const statusWrap = css({
  gridRow: 2,
  gridColumn: '1 / span 3',
})
