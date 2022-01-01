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
          <div ref={ref} className={`tl-positioned-div ${className}`} draggable={false} {...rest}>
            <div className="tl-inner-div">{children}</div>
          </div>
        )}
      </Observer>
    )
  }
)
