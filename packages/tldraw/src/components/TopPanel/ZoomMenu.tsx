import * as React from 'react'
import { useTLDrawContext } from '~hooks'
import type { TLDrawSnapshot } from '~types'
import { styled } from '~styles'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { DMItem, DMContent } from '~components/DropdownMenu'
import { ToolButton } from '~components/ToolButton'

const zoomSelector = (s: TLDrawSnapshot) =>
  s.document.pageStates[s.appState.currentPageId].camera.zoom

export function ZoomMenu() {
  const { state, useSelector } = useTLDrawContext()
  const zoom = useSelector(zoomSelector)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <FixedWidthToolButton onDoubleClick={state.resetZoom} variant="text">
          {Math.round(zoom * 100)}%
        </FixedWidthToolButton>
      </DropdownMenu.Trigger>
      <DMContent align="end">
        <DMItem onSelect={state.zoomIn} kbd="#+">
          Zoom In
        </DMItem>
        <DMItem onSelect={state.zoomOut} kbd="#−">
          Zoom Out
        </DMItem>
        <DMItem onSelect={state.resetZoom} kbd="⇧0">
          To 100%
        </DMItem>
        <DMItem onSelect={state.zoomToFit} kbd="⇧1">
          To Fit
        </DMItem>
        <DMItem onSelect={state.zoomToSelection} kbd="⇧2">
          To Selection
        </DMItem>
      </DMContent>
    </DropdownMenu.Root>
  )
}

const FixedWidthToolButton = styled(ToolButton, {
  minWidth: 56,
})
