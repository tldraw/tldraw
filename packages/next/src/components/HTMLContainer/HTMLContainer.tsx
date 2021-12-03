import { Observer } from 'mobx-react-lite'
import * as React from 'react'

interface HTMLContainerProps extends React.HTMLProps<HTMLDivElement> {
  centered?: boolean
  children: React.ReactNode
}

export const HTMLContainer = React.forwardRef<HTMLDivElement, HTMLContainerProps>(
  function HTMLContainer({ children, centered, className = '', ...rest }, ref) {
    return (
      <Observer>
        {() => (
          <div ref={ref} className={`nu-positioned-div ${className}`} {...rest}>
            <div className={`nu-positioned-inner ${centered ? 'nu-centered' : ''}`}>{children}</div>
          </div>
        )}
      </Observer>
    )
  }
)
