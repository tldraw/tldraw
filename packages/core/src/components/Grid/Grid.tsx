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
  grid: number 
}

export function Grid({ type, grid, camera }: GridProps) {
  switch (type) {
    case 'dots':
      return (
        <Dots grid={grid} camera={camera} />
      )
    case 'squares':
      return (
        <Squares grid={grid} camera={camera} />
      )
    case 'lines':
      return (
        <Lines grid={grid} camera={camera} />
      )
    case 'iso':
      return (
        <Iso grid={grid} camera={camera} />
      )
    case 'music':
      return (
        <Music grid={grid} camera={camera} />
      )
  }
}
