/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLNuApp, TLNuSelectTool, TLNuTool } from '@tldraw/next'
import type { Shape } from './shapes'
import { NuBoxTool } from './tools/NuBoxTool'
import { NuEllipseTool } from './tools/NuEllipseTool'

export class NuApp extends TLNuApp<Shape> {
  constructor() {
    super()
    this.registerToolShortcuts()
    this.selectTool(this.tools[0])
  }

  tools: TLNuTool<Shape>[] = [
    new TLNuSelectTool(this),
    new NuBoxTool(this),
    new NuEllipseTool(this),
  ]
}
