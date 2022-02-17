import { Locator, Page } from '@playwright/test'

const SELECTED_ITEM_REGEX = /c-gxLWou-dpQxDE-cv/

export class ToolButton {
  readonly page: Page
  readonly button: Locator

  constructor(page: Page, selector: string) {
    this.page = page
    this.button = page.locator(selector)
  }

  async activate() {
    await this.button.click()
  }

  async isActive() {
    const classes = await this.button.getAttribute('class')
    if (classes === null) {
      throw new Error('Unable to access element')
    }
    return SELECTED_ITEM_REGEX.test(classes)
  }
}