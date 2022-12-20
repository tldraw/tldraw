import { forwardRef } from 'react'
import { IconProps } from '../types'

export const AlignCenterIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M4.413 6.804c-.473.138-.552 1.01-.12 1.332l.113.084h15.188l.113-.084c.197-.147.273-.324.273-.636s-.076-.489-.273-.636l-.113-.084-7.527-.007c-4.498-.004-7.578.009-7.654.031m3.374 4.474c-.342.068-.519.314-.519.722 0 .462.207.693.663.739.137.014 2.067.02 4.289.013 3.957-.012 4.043-.014 4.176-.092.273-.161.396-.478.327-.845a.646.646 0 0 0-.327-.475c-.133-.079-.213-.08-4.296-.086-2.288-.003-4.229.008-4.313.024M5.599 15.85c-.25.127-.332.288-.332.65 0 .362.082.523.332.65l.178.09h12.446l.178-.09c.25-.127.328-.281.328-.65s-.078-.523-.328-.65l-.178-.09H5.777l-.178.09"
          fill-rule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
