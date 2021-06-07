import React, { useEffect, useRef } from 'react'
import styled from 'styles'

export default function Cursor() {
  const rCursor = useRef<SVGSVGElement>(null)

  useEffect(() => {
    function updatePosition(e: PointerEvent) {
      console.log('hi')
      const cursor = rCursor.current

      cursor.setAttribute(
        'transform',
        `translate(${e.clientX - 12} ${e.clientY - 10})`
      )
    }

    document.body.addEventListener('pointermove', updatePosition)
    return () => {
      document.body.removeEventListener('pointermove', updatePosition)
    }
  }, [])

  return (
    <StyledCursor
      ref={rCursor}
      width="35px"
      height="35px"
      viewBox="0 0 35 35"
      version="1.1"
      pointerEvents="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <path
        d="M12,24.4219 L12,8.4069 L23.591,20.0259 L16.81,20.0259 L16.399,20.1499 L12,24.4219 Z"
        id="point-border"
        fill="#FFFFFF"
      />
      <path
        d="M21.0845,25.0962 L17.4795,26.6312 L12.7975,15.5422 L16.4835,13.9892 L21.0845,25.0962 Z"
        id="stem-border"
        fill="#FFFFFF"
      />
      <path
        d="M19.751,24.4155 L17.907,25.1895 L14.807,17.8155 L16.648,17.0405 L19.751,24.4155 Z"
        id="stem"
        fill="#000000"
      />
      <path
        d="M13,10.814 L13,22.002 L15.969,19.136 L16.397,18.997 L21.165,18.997 L13,10.814 Z"
        id="point"
        fill="#000000"
      />
    </StyledCursor>
  )
}

const StyledCursor = styled('g', {
  position: 'absolute',
  zIndex: 1000,
  top: 0,
  left: 0,
})
