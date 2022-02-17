import {expect, test} from '@playwright/test'
import {PrimaryTool, PrimaryTools} from "../../components/ToolsPanel/PrimaryTools.pom"

const tools = Object.entries(PrimaryTool)

test.describe('Tools Panel', () => {
  let primaryTools: PrimaryTools
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/#/develop')
    primaryTools = new PrimaryTools(page)
  })

  tools.map((tool) => {
    test(`Selecting ${tool[0]} tool`, async () => {
      const toolEl = primaryTools.getTool(tool[1])
      await toolEl.activate()
      const isActive = await toolEl.isActive()
      expect(isActive).toBeTruthy()
    })
  })
})