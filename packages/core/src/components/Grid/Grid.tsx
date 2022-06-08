import * as React from 'react'
import type { TLPageState } from '~types'
import { Dots } from './Dots'
import { Squares } from './Squares'
import { Lines } from './Lines'
import { Iso } from './Iso'
import { Music } from './Music'

export interface GridProps {
  type: 'dots' | 'squares' | 'lines' | 'iso' | 'music', 
  camera: TLPageState['camera']; 
  size: number 
}

export function Grid({ type, size, camera }: GridProps) {
  switch (type) {
    case 'dots':
      return (
        <Dots space={size} camera={camera} />
      )
    case 'squares':
      return (
        <Squares space={size} camera={camera} />
      )
    case 'lines':
      return (
        <Lines space={size} camera={camera} />
      )
    case 'iso':
      return (
        <Iso space={size} camera={camera} />
      )
    case 'music':
      return (
        <Music space={size} camera={camera} />
      )
  }
}
