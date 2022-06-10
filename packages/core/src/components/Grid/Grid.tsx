import * as React from 'react'
import type { GridType, TLPageState } from '~types'
import { Dots } from './Dots'
import { Squares } from './Squares'
import { Lines } from './Lines'
import { Iso } from './Iso'
import { Music } from './Music'

export interface GridProps {
  type: GridType
  subgrid?: boolean
  camera: TLPageState['camera']
  size: number
}

export function Grid({ type, subgrid, size, camera }: GridProps) {
  switch (type) {
    case 'dots':
      return <Dots space={size} subgrid={subgrid} camera={camera} />
    case 'squares':
      return <Squares space={size} subgrid={subgrid} camera={camera} />
    case 'lines':
      return <Lines space={size} subgrid={subgrid} camera={camera} />
    case 'iso':
      return <Iso space={size} subgrid={subgrid} camera={camera} />
    case 'music':
      return <Music space={size} subgrid={subgrid} camera={camera} />
  }
}
