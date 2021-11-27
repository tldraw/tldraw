import { observer } from 'mobx-react-lite'
import * as React from 'react'

interface HTMLContainerProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode
}

export const HTMLContainer = observer(
  React.forwardRef<HTMLDivElement, HTMLContainerProps>(function HTMLContainer(
    { children, className = '', ...rest },
    ref
  ) {
    return (
      <div ref={ref} className={`tl-positioned-div ${className}`} {...rest}>
        {children}
      </div>
    )
  })
)
