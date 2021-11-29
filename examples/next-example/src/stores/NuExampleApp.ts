/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLNuApp } from '@tldraw/next'
import type { Shape } from './shapes'

export class NuExampleApp extends TLNuApp<Shape> {
  constructor() {
    super()
  }
}
