import { useObserver } from 'mobx-react-lite'
import * as React from 'react'

interface HTMLContainerProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode
}

export const HTMLContainer = React.forwardRef<HTMLDivElement, HTMLContainerProps>(
  function HTMLContainer({ children, ...rest }, ref) {
    return useObserver(() => {
      return (
        <div ref={ref} className="tl-positioned-div" {...rest}>
          {children}
        </div>
      )
    })
  }
)
