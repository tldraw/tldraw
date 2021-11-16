import * as React from 'react'
import { useTldrawApp } from '~hooks'
import type { TDSnapshot } from '~types'
import { styled } from '~styles'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { DMItem, DMContent } from '~components/DropdownMenu'
import { ToolButton } from '~components/ToolButton'

const zoomSelector = (s: TDSnapshot) => s.document.pageStates[s.appState.currentPageId].camera.zoom

export function ZoomMenu() {
  const app = useTldrawApp()

  const zoom = app.useStore(zoomSelector)

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger asChild>
        <FixedWidthToolButton onDoubleClick={app.resetZoom} variant="text">
          {Math.round(zoom * 100)}%
        </FixedWidthToolButton>
      </DropdownMenu.Trigger>
      <DMContent align="end">
        <DMItem onSelect={app.zoomIn} kbd="#+">
          Zoom In
        </DMItem>
        <DMItem onSelect={app.zoomOut} kbd="#−">
          Zoom Out
        </DMItem>
        <DMItem onSelect={app.resetZoom} kbd="⇧0">
          To 100%
        </DMItem>
        <DMItem onSelect={app.zoomToFit} kbd="⇧1">
          To Fit
        </DMItem>
        <DMItem onSelect={app.zoomToSelection} kbd="⇧2">
          To Selection
        </DMItem>
      </DMContent>
    </DropdownMenu.Root>
  )
}

const FixedWidthToolButton = styled(ToolButton, {
  minWidth: 56,
})
