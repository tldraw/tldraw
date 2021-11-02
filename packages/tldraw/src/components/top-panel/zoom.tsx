import * as React from 'react'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'
import { toolButtonInner, toolButton, DropdownMenuButton, Kbd, breakpoints } from '~components'
import css from '~styles'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { dropdownContent } from '~components/style-panel/styled'

const zoomSelector = (s: Data) => s.document.pageStates[s.appState.currentPageId].camera.zoom

export function ZoomCounter() {
  const { tlstate, useSelector } = useTLDrawContext()
  const zoom = useSelector(zoomSelector)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={fixedWidthToolButton({ bp: breakpoints, isActive: false })}>
          <div className={toolButtonInner({ bp: breakpoints, variant: 'text' })}>
            {Math.round(zoom * 100)}%
          </div>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content sideOffset={8} className={dropdownContent({ direction: 'vertical' })}>
        <DropdownMenuButton onSelect={tlstate.zoomIn}>
          <span>Zoom In</span>
          <Kbd variant="menu">#+</Kbd>
        </DropdownMenuButton>
        <DropdownMenuButton onSelect={tlstate.zoomOut}>
          <span>Zoom Out</span>
          <Kbd variant="menu">#−</Kbd>
        </DropdownMenuButton>
        <DropdownMenuButton onSelect={tlstate.zoomToActual}>
          <span>To 100%</span>
          <Kbd variant="menu">⇧0</Kbd>
        </DropdownMenuButton>
        <DropdownMenuButton onSelect={tlstate.zoomToFit}>
          <span>To Fit</span>
          <Kbd variant="menu">⇧1</Kbd>
        </DropdownMenuButton>
        <DropdownMenuButton onSelect={tlstate.zoomToSelection}>
          <span>To Selection</span>
          <Kbd variant="menu">⇧2</Kbd>
        </DropdownMenuButton>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

const fixedWidthToolButton = css(toolButton, {
  width: 52,
})
