import { forwardRef } from 'react'
import { IconProps } from '../types'

export const Drawkit = forwardRef<SVGSVGElement, IconProps>(({ ...props }, forwardedRef) => {
  return (
    <svg
      viewBox="0 0 426 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      ref={forwardedRef}
    >
      <g clip-path="url(#a)">
        <path
          d="M191.76 25.3c.23 1.81.23 3.78 0 5.67-.38 3.78-1.06 7.48-2.27 10.95-.68 1.96-1.59 3.93-2.57 5.59-.98 1.81-2.19 3.47-3.32 4.99-1.13 1.36-2.19 2.72-3.47 3.78-1.44 1.36-3.02 2.49-4.68 3.47-1.66 1.06-3.7 1.89-5.51 2.57-1.51.6-3.1 1.13-4.83 1.28-1.81.3-3.85.45-5.89.38-1.96-.08-3.93-.45-5.82-1.06-1.06-.3-1.89-.98-2.57-1.96-.6-.98-.6-2.19-.3-3.25.15-.53.3-.91.75-1.36.3-.38.6-.83 1.13-1.06.53-.38.98-.45 1.59-.6.6-.08 1.06 0 1.66.15h.15V9.9c-.53.08-.98.15-1.51.53-.3.08-.68.23-1.06.3-.68.53-1.43.75-2.11.75-.38 0-.83-.23-1.06-.23-1.06-.23-1.96-1.13-2.57-1.89-.38-.45-.53-1.06-.53-1.59a5.77 5.77 0 0 1 0-1.66c.15-.6.53-1.06.98-1.44.15-.53.53-.83 1.06-1.13 1.13-.53 2.27-1.06 3.32-1.43 1.81-.68 3.47-1.21 5.21-1.51 2.19-.45 4.3-.6 6.5-.6s4.38.15 6.57.68c1.89.3 3.7 1.06 5.51 1.89 1.44.6 2.87 1.43 4.23 2.34 1.59.98 3.02 2.34 4.3 3.63 2.72 3.02 4.76 6.35 5.89 10.12.75 2.12 1.06 4.31 1.21 6.65l.01-.01Zm-8.39-.83c-.3-1.66-.83-3.32-1.36-4.99-.6-1.21-1.28-2.42-2.19-3.63-.98-1.21-2.19-2.19-3.32-3.32-1.36-.98-2.72-1.89-4.31-2.57-1.74-.68-3.47-1.13-5.36-1.51-.83-.08-1.74-.08-2.57-.08v46.85c1.36-.3 2.8-.75 4-1.21 1.66-.75 3.4-1.74 4.83-2.72 1.59-1.44 3.02-2.8 4.15-4.31 1.51-2.04 2.64-4.08 3.63-6.27 1.13-2.72 1.96-5.66 2.27-8.46.45-2.57.45-5.21.23-7.78ZM228.55 28.4c.23.68.23 1.59 0 2.27-.08.38-.23.6-.38.91-.3.68-.91 1.21-1.59 1.66-.3.15-.6.23-.91.38-.6.3-1.28.3-1.66.08-.53 0-1.13-.23-1.51-.45-.53-.45-1.06-.68-1.21-1.06-.38-.6-.68-1.06-.75-1.51-.08-.6-.23-1.06-.45-1.59-.23-.3-.38-.68-.68-1.06-.23-.3-.53-.6-.83-.91-.23-.08-.6-.3-.98-.38-.38-.3-.75-.45-1.21-.45h-1.28c-.38 0-.83.15-1.21.3-.45.3-.98.53-1.36.91-.83.6-1.59 1.36-2.11 2.12-.98 1.21-1.81 2.64-2.49 4.08-.6 1.59-.83 3.17-1.21 4.76.08 1.44.08 2.64.3 3.93.08 5.21.3 10.27.3 15.26 0 .83-.08 1.51-.3 2.12-.3.38-.53.6-.83.98-.45.53-1.06.83-1.81 1.13-.38 0-.75 0-1.13.08-.53 0-1.21-.08-1.66-.38-.45-.15-.98-.45-1.36-.83-.45-.53-.75-.91-.91-1.44-.3-.45-.38-1.06-.38-1.66 0-2.79-.08-5.59-.3-8.46-.08-4.99-.38-10.12-.68-15.18-.3-5.14-.76-10.27-1.13-15.26 0-.83.15-1.43.53-2.19.23-.3.38-.53.68-.91.53-.45 1.21-.83 1.81-1.06.38 0 .91 0 1.28-.15.45 0 1.06.15 1.59.38s.91.53 1.28.83c.53.53.83.91.98 1.51.23.38.38.98.38 1.59.08 1.21.08 2.42.23 3.55.23-.3.6-.53.91-.76.53-.38.83-.75 1.36-1.13.3-.3.45-.38.75-.45.38-.3.83-.68 1.44-.76.75-.38 1.59-.83 2.57-.98.23-.08.45-.08.83-.3.68 0 1.28-.08 1.89-.08.98-.08 1.89 0 2.87.3.38 0 1.06.08 1.59.3.68.3 1.21.6 1.81.75.3.08.45.23.76.38.23.08.45.38.75.45.38.38.91.76 1.28 1.13.38.38.91.68 1.21 1.13.6.68.98 1.36 1.59 2.04.45.83.68 1.59.98 2.49.15.38.3 1.06.38 1.59h-.02ZM270.24 56.05c.3.76.3 1.44 0 2.19-.08.38-.15.76-.45 1.13-.38.6-.91 1.06-1.44 1.36-.38.15-.75.45-1.06.53-.6.08-1.06.08-1.66 0-.6 0-1.13-.08-1.51-.53-.6-.15-.98-.53-1.21-.98-.38-.38-.6-.98-.83-1.51-.45-3.1-.83-6.19-1.13-9.29-.15-.3-.15-.45-.15-.76-.6 1.51-1.28 2.87-2.04 4.31-.45.68-.91 1.36-1.44 2.19-.68.91-1.51 1.89-2.34 2.64-.83.91-1.81 1.66-2.72 2.42-1.06.68-2.11 1.13-3.25 1.59-.45.23-.98.3-1.36.45-.6.15-1.21.23-1.89.23-.53 0-1.21-.08-1.81-.23-.3 0-.38-.15-.6-.23-.38-.23-.98-.38-1.44-.68-.23-.15-.45-.23-.53-.3-.45-.38-.91-.6-1.28-.98-.53-.53-.83-.98-1.21-1.43-.38-.53-.83-.98-1.21-1.51-.38-.68-.68-1.59-1.28-2.42-.83-1.89-1.66-4-2.19-6.19-.23-.83-.38-1.74-.53-2.64-.08-1.28-.3-2.49-.3-3.93-.08-1.81 0-3.63.23-5.36.23-2.42.6-4.53 1.28-6.57.23-.91.6-1.81.91-2.72.38-1.21.98-2.27 1.66-3.47.23-.75.83-1.59 1.43-2.34.68-.91 1.36-1.89 2.49-2.87.75-.68 1.89-1.59 2.87-2.19.98-.6 2.19-1.06 3.4-1.51.98-.38 2.19-.68 3.4-.76 1.36-.23 2.57 0 3.78.08 1.13.3 2.19.68 3.4 1.13.6.38 1.36.68 2.19 1.28.38.23.91.6 1.28.98.23-.45.6-.91.91-1.28.38-.3.68-.53.91-.83.45-.38.98-.45 1.51-.45.38-.15.76-.15 1.28 0 .38 0 .98.08 1.51.45l.83.83c.38.38.68.68.83 1.28.3.53.45.98.45 1.59-.23 2.49-.45 5.14-.53 7.63-.23 4.68-.53 9.22-.53 13.67.15 4.46.45 8.84.91 13.14.15.91.38 1.89.45 2.87l.01-.01Zm-11.1-28.4v-.23c-.45-.68-.91-1.51-1.51-2.27-.6-.83-1.21-1.28-1.81-1.81-.45-.38-.98-.75-1.36-1.06-.53-.15-.91-.23-1.51-.23h-1.36c-.6 0-1.21.23-1.81.53-.76.15-1.28.68-1.96 1.13-.68.53-1.28 1.13-1.74 1.81a31.03 31.03 0 0 0-2.12 3.63c-.91 2.34-1.59 4.76-1.89 7.03 0 .53 0 .91-.15 1.28-.15 2.04-.15 4.15.15 6.19.3 2.12.91 4 1.59 6.04.6 1.06 1.21 2.27 1.89 3.32.15.15.23.23.53.38.08 0 .3 0 .38-.15.6-.23.98-.38 1.51-.76.6-.6 1.28-1.43 1.89-2.12.3-.3.6-.91.91-1.28 1.51-2.19 2.49-4.53 3.47-6.87.76-1.74 1.44-3.25 2.04-4.91 1.06-3.32 2.04-6.5 2.87-9.67l-.01.02ZM369.65 18.96c.08.6 0 1.06-.45 1.66-.08.53-.38.98-.83 1.36-1.59 1.74-3.32 3.4-4.98 5.06-3.1 2.87-6.2 5.67-9.29 8.23-.98.75-1.89 1.59-3.02 2.34.68.3 1.28.45 1.74.76 1.06.53 1.96.91 2.8 1.43.91.45 1.81 1.13 2.57 1.66 1.21.91 2.19 1.74 3.32 2.72.68.76 1.36 1.51 1.96 2.19a21.55 21.55 0 0 1 2.57 3.4c.6.91 1.13 1.59 1.59 2.64.6 1.21 1.13 2.57 1.59 3.78.15.83.15 1.59 0 2.34-.08.3-.38.68-.45.91-.38.75-.83 1.21-1.51 1.59-.38.08-.68.3-1.06.38-.45.3-1.13.3-1.74.15-.38 0-1.06-.23-1.59-.53-.45-.3-.83-.6-.98-.98-.6-.6-.83-.91-.98-1.51-.08-.38-.23-.76-.3-.98-.76-1.74-1.59-3.32-2.72-4.76-1.28-1.51-2.64-2.79-4-3.93-1.59-1.28-3.4-2.34-5.29-3.1-1.36-.6-2.64-.91-4-1.28 0 4.15.15 9.22.23 13.29 0 1.21-.45 2.19-1.21 3.1-.76.83-1.96 1.21-3.1 1.21-.53 0-1.06-.08-1.66-.38-.45-.15-.91-.45-1.28-.83-.75-.91-1.21-1.89-1.21-3.1-.15-3.55-.23-8.31-.23-11.93-.08-6.42-.38-12.77-.45-19.26-.23-6.42-.3-12.77-.38-19.34-.08-1.21.45-2.19 1.21-2.95.76-.91 1.89-1.28 2.95-1.28.53-.15 1.06 0 1.59.38.53.08.98.38 1.36.91.83.68 1.21 1.74 1.36 2.95 0 3.63.08 7.18.15 10.8.23 4.76.23 9.52.3 14.28.3-.15.38-.23.6-.45 1.21-.91 2.42-1.89 3.7-2.95 2.42-1.89 4.76-4.23 7.1-6.19 2.27-2.19 4.61-4.61 6.8-6.72.45-.6 1.06-.91 1.81-1.13.38 0 .76 0 1.13-.15.83 0 1.51.23 2.19.6.3.3.53.53.83.68.45.45.76.76.83 1.36.45.45.53.91.45 1.59l-.02-.02ZM383.85 26.36c.3.6.38 1.13.38 1.66-.08 2.49-.23 4.98-.23 7.4-.15 4.38-.23 4.53-.23 8.91-.08 4.38 0 8.76 0 13.07 0 .83-.15 1.51-.6 2.12-.23.38-.3.68-.6.83-.53.6-1.21 1.06-1.89 1.13-.38.08-.76.08-1.06.08-.6.23-1.13 0-1.66-.23-.53-.3-.98-.45-1.43-.98-.3-.38-.68-.83-.76-1.21-.3-.53-.38-1.06-.38-1.74v-7.33c0-4.38 0-4.61.08-8.91 0-4.23.15-8.76.38-13.14 0-.6.15-1.28.6-2.12.23-.15.38-.53.6-.75.53-.53 1.21-.91 1.96-1.06.3 0 .68-.23.98-.23.68 0 1.13.23 1.59.38.6.08 1.06.45 1.51.91.3.23.6.75.75 1.21h.01Zm1.44-14.8c.08.53 0 1.06-.45 1.66-.08.45-.3.98-.83 1.36-.3.3-.83.68-1.36.75-.45.38-1.06.45-1.66.45-.68 0-1.36-.08-1.96-.6-.38-.15-.68-.45-.91-.6-.6-.45-.98-1.28-1.06-1.96-.08-.45-.08-.68-.23-1.06 0-.6.15-1.13.3-1.59.3-.6.45-1.06.98-1.51.38-.3.91-.6 1.36-.76.45-.38 1.06-.45 1.51-.45.83 0 1.59.3 2.19.6.23.3.6.53.83.6.68.53.91 1.28 1.06 1.96.23.45.23.68.23 1.13v.02ZM425.02 55.67c.15.53.15 1.21-.15 1.66-.15.68-.3 1.06-.75 1.51-.15.38-.6.83-1.13 1.06-.15.23-.6.38-.91.6-.68.3-1.36.68-1.96.91-.38.15-.83.3-1.06.38-1.13.45-2.42.53-3.47.6-1.13 0-2.27-.08-3.32-.15-.83-.23-1.59-.38-2.27-.68-2.19-.75-4.08-1.81-5.67-3.4-.38-.38-.53-.6-.91-.91-.45-.6-.98-1.21-1.21-1.96-.83-.98-1.36-2.19-1.59-3.32-.83-2.12-1.06-4.31-1.13-6.5-.38-1.81-.38-3.85-.45-5.82V33c-1.81.23-3.47.3-5.21.38-.75 0-1.51-.15-2.11-.6-.23-.15-.68-.45-.91-.6-.6-.53-.91-1.13-1.06-1.96-.08-.23-.08-.68-.08-1.06-.08-.6 0-1.13.3-1.66.15-.53.45-.98.83-1.28.45-.38.91-.83 1.36-.91.45-.15 1.06-.3 1.66-.3 1.36-.15 2.8-.3 4.23-.38.38 0 .68 0 1.06-.15.08-4.08.45-8.16.68-12.31 0-.6.23-1.28.76-2.04.08-.3.23-.6.6-.75a2.7 2.7 0 0 1 1.81-1.06c.38-.15.83-.15 1.06-.38.68 0 1.06.23 1.59.53.6.23.98.38 1.51.91.3.38.53.75.83 1.21.23.53.3 1.13.3 1.59-.15 2.72-.3 5.36-.45 7.93-.15 1.28-.15 2.57-.23 3.78 1.96-.15 3.85-.23 5.74-.3.83 0 1.59.08 2.19.53.23.15.6.38.91.6.38.53.75 1.13 1.06 1.81.08.38.08.83.08 1.28.08.53 0 1.06-.38 1.59-.08.3-.53.83-.75 1.28-.45.45-.91.6-1.44.98-.45.15-1.06.38-1.66.38-1.36 0-2.87.08-4.31.15-.53.15-1.06.15-1.59.15V34c0 2.27 0 4.68.15 7.03 0 1.66 0 3.4.23 5.06.3 1.43.45 2.57.98 4 .23.6.53 1.06.98 1.66.3.23.68.68 1.06.91.38.38.83.68 1.36.83.38.08 1.06.45 1.66.53h1.89c.68-.08 1.06-.3 1.51-.53.53-.15.98-.45 1.51-.83.68-.3 1.36-.68 2.11-.68.45.3.83.3 1.13.3 1.06.15 1.96 1.06 2.57 1.81.3.45.45 1.06.45 1.59l.01-.01ZM318.17 61.73c-7 0-12.7-3.17-16.95-9.41-4.54-6.67-7.3-14.71-7.19-20.98.12-7.27 4.85-10.59 9.2-10.59 2.24 0 4.05 1.81 4.05 4.05 0 2.24-1.81 4.05-4.05 4.05-1.03 0-1.1 2.36-1.11 2.63-.08 4.54 2.25 11.09 5.79 16.29 3.54 5.2 7.35 5.87 10.26 5.87 1.13 0 4.55 0 5.93-7.46 1.43-7.79-1.3-19.9-3.26-23.89-.99-2-.16-4.43 1.84-5.42 2-.99 4.43-.16 5.42 1.84 2.82 5.73 5.69 19.51 3.96 28.92-2.34 12.72-10.49 14.09-13.88 14.09l-.01.01Z"
          fill="#1A1A1A"
        />
        <path
          d="M288.25 61.73c-3.4 0-11.54-1.37-13.88-14.09-1.73-9.41 1.14-23.19 3.96-28.92.99-2 3.41-2.83 5.42-1.84a4.04 4.04 0 0 1 1.84 5.42c-1.96 3.99-4.7 16.1-3.26 23.89 1.37 7.47 4.8 7.47 5.92 7.47 2.92 0 6.72-.67 10.26-5.87s5.87-11.74 5.79-16.29c0-.27-.07-2.63-1.11-2.63-2.24 0-4.05-1.81-4.05-4.05 0-2.24 1.81-4.05 4.05-4.05 4.35 0 9.08 3.31 9.2 10.59.1 6.27-2.65 14.31-7.19 20.98-4.25 6.24-9.95 9.41-16.95 9.41v-.02Z"
          fill="#1A1A1A"
        />
        <path
          d="M15.48 55.8c-3.6 0-12.24-1.46-14.72-14.94-1.83-9.98 1.22-24.58 4.21-30.66a4.28 4.28 0 0 1 5.74-1.95 4.28 4.28 0 0 1 1.95 5.74c-2.08 4.23-4.98 17.06-3.46 25.32 1.46 7.91 5.09 7.91 6.28 7.91 3.09 0 7.13-.71 10.88-6.22 3.75-5.51 6.22-12.45 6.14-17.27 0-.28-.08-2.78-1.17-2.78a4.29 4.29 0 0 1-4.29-4.29 4.29 4.29 0 0 1 4.29-4.29c4.61 0 9.62 3.51 9.75 11.22.11 6.65-2.81 15.17-7.63 22.24-4.5 6.62-10.55 9.97-17.97 9.97Z"
          fill="#FFD600"
        />
        <path
          d="M46.25 55.8c-7.42 0-13.47-3.36-17.97-9.97-4.81-7.07-7.73-15.59-7.63-22.24.13-7.71 5.14-11.22 9.75-11.22a4.29 4.29 0 0 1 4.29 4.29 4.29 4.29 0 0 1-4.29 4.29c-1.09 0-1.17 2.5-1.17 2.78-.08 4.82 2.39 11.76 6.14 17.27 3.75 5.51 7.79 6.22 10.88 6.22a4.29 4.29 0 0 1 4.29 4.29 4.29 4.29 0 0 1-4.29 4.29Z"
          fill="#FF6B00"
        />
        <path
          d="M46.25 55.8a4.29 4.29 0 0 1-4.29-4.29 4.29 4.29 0 0 1 4.29-4.29c3.09 0 7.13-.71 10.88-6.22 3.75-5.51 6.22-12.45 6.14-17.27 0-.28-.08-2.78-1.17-2.78a4.29 4.29 0 0 1-4.29-4.29 4.29 4.29 0 0 1 4.29-4.29c4.61 0 9.62 3.51 9.75 11.22.11 6.65-2.81 15.17-7.62 22.24-4.51 6.62-10.55 9.97-17.97 9.97h-.01Z"
          fill="#FF6B00"
        />
        <path
          d="M76.87 55.8c-7.42 0-13.47-3.36-17.97-9.97-4.81-7.07-7.73-15.59-7.63-22.24.13-7.71 5.14-11.22 9.75-11.22a4.29 4.29 0 0 1 4.29 4.29 4.29 4.29 0 0 1-4.29 4.29c-1.09 0-1.17 2.5-1.17 2.78-.08 4.82 2.39 11.76 6.14 17.27 3.75 5.51 7.79 6.22 10.88 6.22a4.29 4.29 0 0 1 4.29 4.29 4.29 4.29 0 0 1-4.29 4.29Z"
          fill="#0071CE"
        />
        <path
          d="M76.87 55.8a4.29 4.29 0 0 1-4.29-4.29 4.29 4.29 0 0 1 4.29-4.29c3.09 0 7.13-.71 10.88-6.22 3.75-5.51 6.22-12.45 6.14-17.27 0-.28-.08-2.78-1.17-2.78a4.29 4.29 0 0 1-4.29-4.29 4.29 4.29 0 0 1 4.29-4.29c4.61 0 9.62 3.51 9.75 11.22.11 6.65-2.81 15.17-7.62 22.24-4.51 6.62-10.55 9.97-17.97 9.97h-.01Z"
          fill="#0071CE"
        />
        <path
          d="M107.63 55.8c-7.42 0-13.47-3.36-17.97-9.97-4.81-7.07-7.73-15.59-7.62-22.24.13-7.71 5.14-11.22 9.75-11.22a4.29 4.29 0 0 1 4.29 4.29 4.29 4.29 0 0 1-4.29 4.29c-1.09 0-1.17 2.5-1.17 2.78-.08 4.82 2.39 11.76 6.14 17.27 3.75 5.51 7.79 6.22 10.88 6.22 1.19 0 4.83 0 6.28-7.91 1.52-8.26-1.38-21.09-3.46-25.32a4.283 4.283 0 0 1 1.95-5.74c2.12-1.05 4.7-.17 5.74 1.95 2.99 6.08 6.04 20.68 4.2 30.66-2.48 13.49-11.12 14.94-14.72 14.94Z"
          fill="#FA7598"
        />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" transform="translate(.21)" d="M0 0h424.91v64H0z" />
        </clipPath>
      </defs>
    </svg>
  )
})
