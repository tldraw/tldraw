import * as React from 'react'

interface HTMLContainerProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode
}

export const HTMLContainer = React.memo(
  React.forwardRef<HTMLDivElement, HTMLContainerProps>(function HTMLContainer(
    { children, className = '', shape, ...rest },
    ref
  ) {
    // const handleClick = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    //   e.stopPropagation()
    //   console.log('dddd', e)
    // }, [])

    return (
      <div ref={ref} className={`tl-positioned-div ${className}`} draggable={false} {...rest}>
        <div className="tl-inner-div">
          {/* {shape === 'template' && (
            <div
              style={{
                position: 'absolute',
                top: '0px',
                left: '0px',
                width: '100%',
                height: '2rem',
                backgroundColor: '#e9e9e9',
                zIndex: 1,
              }}
            >
              TEST
              <button
                type="button"
                onClick={() => {
                  console.log('Click Click !!!')
                }}
              >
                test
              </button>
            </div>
          )} */}
          {children}
        </div>
      </div>
    )
  })
)
