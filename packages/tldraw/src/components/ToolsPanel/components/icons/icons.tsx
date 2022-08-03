import * as React from 'react'

export const Cursor = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.12 13.12L10.88 19L5 5L19 10.88L13.12 13.12ZM13.12 13.12L19 19"
        stroke="#BEBEC0"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const Pencil = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14.25 7.08594L16.75 9.58594M5 18.8358L9.25 17.8358L18.5429 8.5429C18.9334 8.15237 18.9334 7.51921 18.5429 7.12868L16.7071 5.2929C16.3166 4.90237 15.6834 4.90237 15.2929 5.2929L6 14.5858L5 18.8358Z"
      stroke="#BEBEC0"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const Text = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14 4H15.8343C15.9404 4 16.0421 4.04214 16.1172 4.11716L17 5M17 5V12.1059M17 5L17.8828 4.11716C17.9579 4.04214 18.0596 4 18.1657 4H20M17 19V12.1059M17 19L16.1172 19.8833C16.0421 19.9583 15.9404 20.0005 15.8343 20.0005H14M17 19L17.8828 19.8833C17.9579 19.9583 18.0596 20.0005 18.1657 20.0005H20M17 12.1059H14M17 12.1059H20"
      stroke="#BEBEC0"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M4 16.4602L7.30257 8.0203C7.43522 7.68131 7.91492 7.68131 8.04756 8.0203L11.3501 16.4602"
      stroke="#BEBEC0"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M5.63281 13.377H9.71622" stroke="#BEBEC0" strokeWidth="1.5" />
  </svg>
)

export const Sticky = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20 15.2941L17.4819 19.103C17.1116 19.6631 16.485 20 15.8136 20H15.5M20 15.2941V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H15.5M20 15.2941H17.5C16.3954 15.2941 15.5 16.1895 15.5 17.2941V20"
      stroke="#BEBEC0"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const Rect = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="1"
        stroke="#BEBEC0"
        strokeWidth="1.5"
        strokeLinejoin="bevel"
      />
    </svg>
  )
}

export const Circle = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="7"
        stroke="#BEBEC0"
        strokeWidth="1.5"
        strokeLinejoin="bevel"
      />
    </svg>
  )
}

export const Triangle = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11.134 6.5C11.5189 5.83333 12.4811 5.83333 12.866 6.5L18.9282 17C19.3131 17.6667 18.832 18.5 18.0622 18.5H5.93782C5.16802 18.5 4.6869 17.6667 5.0718 17L11.134 6.5Z"
        stroke="#BEBEC0"
        strokeWidth="1.4"
      />
    </svg>
  )
}

export const Line = () => {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3.64645 11.3536C3.45118 11.1583 3.45118 10.8417 3.64645 10.6465L11.1464 3.14645C11.3417 2.95118 11.6583 2.95118 11.8536 3.14645C12.0488 3.34171 12.0488 3.65829 11.8536 3.85355L4.35355 11.3536C4.15829 11.5488 3.84171 11.5488 3.64645 11.3536Z" />
    </svg>
  )
}
