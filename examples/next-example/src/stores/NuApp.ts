/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLNuApp, TLNuSelectTool, TLNuTool } from '@tldraw/next'
import type { Shape } from './shapes'
import { NuBoxTool } from './tools/NuBoxTool'
import { NuEllipseTool } from './tools/NuEllipseTool'

export class NuApp extends TLNuApp<Shape> {
  constructor() {
    super()
    this.registerToolShortcuts()
  }

  tools: Record<string, TLNuTool<Shape>> = {
    select: new TLNuSelectTool(this),
    box: new NuBoxTool(this),
    ellipse: new NuEllipseTool(this),
  }
}
