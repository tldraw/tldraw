import { fireEvent, render } from '@testing-library/react'
import { Tldraw } from '../Tldraw'

const toolIds = [
  'TD-PrimaryTools-CursorArrow',
  'TD-PrimaryTools-Pencil',
  'TD-PrimaryTools-Eraser',
  'TD-PrimaryTools-Shapes',
  'TD-PrimaryTools-Shapes-rectangle',
  'TD-PrimaryTools-Shapes-ellipse',
  'TD-PrimaryTools-Shapes-triangle',
  'TD-PrimaryTools-Shapes-line',
  'TD-PrimaryTools-ArrowTopRight',
  'TD-PrimaryTools-Text',
  'TD-PrimaryTools-Pencil2',
  'TD-PrimaryTools-Image',
]

const dashAndSizeIds = [
  'TD-Styles-Dash-draw',
  'TD-Styles-Dash-solid',
  'TD-Styles-Dash-dashed',
  'TD-Styles-Dash-dotted',
  'TD-Styles-Dash-small',
  'TD-Styles-Dash-medium',
  'TD-Styles-Dash-large',
]

describe('tool buttons accessibility', () => {
  const { container } = render(<Tldraw />)

  const testButtons = (buttonId: string, ids: Array<string>) => {
    const button = container.querySelector(`#${buttonId}`)
    if (!button) return
    fireEvent.click(button)

    describe(`accessibility`, () => {
      for (const id of ids) {
        it(`component ${id} has aria-label`, async () => {
          const element = container.querySelector(`#${id}`)
          const ariaLabel = element?.getAttribute('aria-label')
          // eslint-disable-next-line jest/no-standalone-expect
          expect(ariaLabel).not.toBeNull()
        })
      }
    })
  }

  testButtons('TD-PrimaryTools-Shapes', toolIds)
  testButtons('TD-Styles', dashAndSizeIds)
})
