import * as React from 'react'
import { useTldrawApp } from '~hooks'
import type { TDSnapshot } from '~types'
import { styled } from '~styles'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { DMItem, DMContent } from '~components/Primitives/DropdownMenu'
import { ToolButton } from '~components/Primitives/ToolButton'
import { preventEvent } from '~components/preventEvent'

const zoomSelector = (s: TDSnapshot) => s.document.pageStates[s.appState.currentPageId].camera.zoom

export const ZoomMenu = React.memo(function ZoomMenu() {
  const app = useTldrawApp()

  const zoom = app.useStore(zoomSelector)

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger dir="ltr" asChild id="TD-Zoom">
        <FixedWidthToolButton onDoubleClick={app.resetZoom} variant="text">
          {Math.round(zoom * 100)}%
        </FixedWidthToolButton>
      </DropdownMenu.Trigger>
      <DMContent align="end">
        <DMItem onSelect={preventEvent} onClick={app.zoomIn} kbd="#+" id="TD-Zoom-Zoom_In">
          Zoom In
        </DMItem>
        <DMItem onSelect={preventEvent} onClick={app.zoomOut} kbd="#−" id="TD-Zoom-Zoom_Out">
          Zoom Out
        </DMItem>
        <DMItem onSelect={preventEvent} onClick={app.resetZoom} kbd="⇧0" id="TD-Zoom-Zoom_To_100%">
          To 100%
        </DMItem>
        <DMItem onSelect={preventEvent} onClick={app.zoomToFit} kbd="⇧1" id="TD-Zoom-To_Fit">
          To Fit
        </DMItem>
        <DMItem
          onSelect={preventEvent}
          onClick={app.zoomToSelection}
          kbd="⇧2"
          id="TD-Zoom-To_Selection"
        >
          To Selection
        </DMItem>
      </DMContent>
    </DropdownMenu.Root>
  )
})

const FixedWidthToolButton = styled(ToolButton, {
  minWidth: 56,
})
