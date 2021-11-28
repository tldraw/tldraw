import { Observer } from 'mobx-react-lite'
import * as React from 'react'

interface HTMLContainerProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode
}

export const HTMLContainer = React.forwardRef<HTMLDivElement, HTMLContainerProps>(
  function HTMLContainer({ children, className = '', ...rest }, ref) {
    return (
      <Observer>
        {() => (
          <div ref={ref} className={`nu-positioned-div ${className}`} {...rest}>
            {children}
          </div>
        )}
      </Observer>
    )
  }
)
