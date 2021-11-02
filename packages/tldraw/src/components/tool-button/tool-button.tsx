import * as React from 'react'
import { Tooltip, toolButton, toolButtonInner, breakpoints } from '~components'

interface ToolButtonProps {
  label: string
  kbd: string
  onClick: () => void
  onDoubleClick?: () => void
  isActive: boolean
  children: React.ReactNode
}

export function ToolButton({
  label,
  kbd,
  onClick,
  onDoubleClick,
  isActive,
  children,
}: ToolButtonProps): JSX.Element {
  return (
    <Tooltip label={label[0].toUpperCase() + label.slice(1)} kbd={kbd}>
      <button
        className={toolButton({
          bp: breakpoints,
          name: label,
          isActive,
        })}
        onPointerDown={onClick}
        onDoubleClick={onDoubleClick}
      >
        <div className={toolButtonInner({ isActive, bp: breakpoints })}>{children}</div>
      </button>
    </Tooltip>
  )
}
