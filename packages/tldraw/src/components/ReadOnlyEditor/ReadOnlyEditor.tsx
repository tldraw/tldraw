import { Renderer, TLPageState } from '@tlslides/core'
import React from 'react'
import { Tldraw } from '../../Tldraw'
import { useTldrawApp } from '~hooks'
import { shapeUtils } from '~state/shapes'
import { styled } from '~styles'
import { TDPage } from '~types'
import { TldrawApp } from '~state'

interface ReadOnlyEditorProps {
  page: TDPage
  pageState: TLPageState
}

export function ReadOnlyEditor({ page, pageState }: ReadOnlyEditorProps) {
  const app = useTldrawApp()
  const rWrapper = React.useRef<HTMLDivElement>(null)
  const state = app.useStore()

  const { settings, appState } = state

  // Custom rendering meta, with dark mode for shapes
  const meta = React.useMemo(() => {
    return { isDarkMode: settings.isDarkMode }
  }, [settings.isDarkMode])

  // Custom theme, based on darkmode
  const theme = React.useMemo(() => {
    const { selectByContain } = appState
    const { isDarkMode, isCadSelectMode } = settings

    if (isDarkMode) {
      const brushBase = isCadSelectMode
        ? selectByContain
          ? '69, 155, 255'
          : '105, 209, 73'
        : '180, 180, 180'
      return {
        brushFill: `rgba(${brushBase}, ${isCadSelectMode ? 0.08 : 0.05})`,
        brushStroke: `rgba(${brushBase}, ${isCadSelectMode ? 0.5 : 0.25})`,
        brushDashStroke: `rgba(${brushBase}, .6)`,
        selected: 'rgba(38, 150, 255, 1.000)',
        selectFill: 'rgba(38, 150, 255, 0.05)',
        background: '#212529',
        foreground: '#49555f',
      }
    }

    const brushBase = isCadSelectMode ? (selectByContain ? '0, 89, 242' : '51, 163, 23') : '0,0,0'

    return {
      brushFill: `rgba(${brushBase}, ${isCadSelectMode ? 0.08 : 0.05})`,
      brushStroke: `rgba(${brushBase}, ${isCadSelectMode ? 0.4 : 0.25})`,
      brushDashStroke: `rgba(${brushBase}, .6)`,
    }
  }, [settings.isDarkMode, settings.isCadSelectMode, appState.selectByContain])

  const handleOpenPage = React.useCallback(() => {
    app.changePage(page.id)
  }, [app])

  return (
    <StyledContainer active={page.id === app.currentPageId}>
      <StyledLayout tabIndex={-0} ref={rWrapper} onClick={handleOpenPage}>
        <Renderer
          containerRef={rWrapper}
          shapeUtils={shapeUtils}
          page={page}
          pageState={pageState}
          theme={theme}
          meta={meta}
        />
      </StyledLayout>
    </StyledContainer>
  )
}

const StyledContainer = styled('div', {
  position: 'relative',
  width: '100%',
  height: 115,
  overflow: 'hidden',
  borderRadius: '$3',
  variants: {
    active: {
      true: {
        boxShadow: 'rgb(3 102 214 / 30%) 0px 0px 0px 2px',
      },
    },
  },
})

const StyledLayout = styled('div', {
  position: 'absolute',
  borderRadius: '$3',
  height: '100%',
  width: '100%',
  minHeight: 0,
  minWidth: 0,
  maxHeight: '100%',
  maxWidth: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box',
  outline: 'none',

  '& .tl-container': {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
    zIndex: 1,
  },

  '& input, textarea, button, select, label, button': {
    webkitTouchCallout: 'none',
    webkitUserSelect: 'none',
    '-webkit-tap-highlight-color': 'transparent',
    'tap-highlight-color': 'transparent',
  },
})
