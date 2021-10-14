import * as React from 'react'
import type { TLBounds } from '+types'
import { CloneButton } from './clone-button'

export interface CloneButtonsProps {
  bounds: TLBounds
}

export function CloneButtons({ bounds }: CloneButtonsProps) {
  return (
    <>
      <CloneButton bounds={bounds} side="top" />
      <CloneButton bounds={bounds} side="right" />
      <CloneButton bounds={bounds} side="bottom" />
      <CloneButton bounds={bounds} side="left" />
    </>
  )
}
