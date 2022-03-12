import { Page } from '@playwright/test'
import { ToolButton } from '../Primitives/ToolButton/ToolButton.pom'

export enum PrimaryTool {
  Select = 'CursorArrow',
  Pencil = 'Pencil',
  Eraser = 'Eraser',
  Arrow = 'ArrowTopRight',
  Text = 'Text',
  Sticky = 'Pencil2'
}

export class PrimaryTools {
  readonly page: Page
  readonly selectTool: ToolButton
  readonly pencilTool: ToolButton
  readonly eraserTool: ToolButton
  readonly arrowTool: ToolButton
  readonly textTool: ToolButton
  readonly stickyTool: ToolButton

  constructor(page: Page) {
    this.page = page
    this.selectTool = new ToolButton(page, `#TD-PrimaryTools-${PrimaryTool.Select}`)
    this.pencilTool = new ToolButton(page, `#TD-PrimaryTools-${PrimaryTool.Pencil}`)
    this.eraserTool = new ToolButton(page, `#TD-PrimaryTools-${PrimaryTool.Eraser}`)
    this.arrowTool = new ToolButton(page, `#TD-PrimaryTools-${PrimaryTool.Arrow}`)
    this.textTool = new ToolButton(page, `#TD-PrimaryTools-${PrimaryTool.Text}`)
    this.stickyTool = new ToolButton(page, `#TD-PrimaryTools-${PrimaryTool.Sticky}`)
  }

  getTool(tool: string): ToolButton {
    switch (tool) {
      case PrimaryTool.Select:
        return this.selectTool
      case PrimaryTool.Pencil:
        return this.pencilTool
      case PrimaryTool.Eraser:
        return this.eraserTool
      case PrimaryTool.Arrow:
        return this.arrowTool
      case PrimaryTool.Text:
        return this.textTool
      case PrimaryTool.Sticky:
        return this.stickyTool
      default:
        throw new Error('No tool defined')
    }
  }
}