import { act, render } from '@testing-library/react'
import Vec from '@tldraw/vec'
import { action, makeAutoObservable } from 'mobx'
import * as React from 'react'
import type { BoxShape } from '~TLShapeUtil/TLShapeUtil.spec'
import { mockDocument, mockUtils } from '~test'
import type { TLBounds, TLPage, TLPageState } from '~types'
import Utils from '~utils'
import { Renderer } from './Renderer'

describe('renderer', () => {
  test('mounts component without crashing', () => {
    render(
      <Renderer
        shapeUtils={mockUtils}
        page={mockDocument.page}
        pageState={mockDocument.pageState}
      />
    )
  })
})

describe('When passing observables', () => {
  it('updates when the observables change', () => {
    class PageState implements TLPageState {
      id
      selectedIds
      camera
      brush?: TLBounds
      pointedId?: string
      hoveredId?: string
      editingId?: string
      bindingId?: string

      constructor(opts = {} as TLPageState) {
        const {
          id = Utils.uniqueId(),
          selectedIds = [],
          camera = {
            point: [0, 0],
            zoom: 1,
          },
        } = opts
        this.id = id
        this.camera = camera
        this.selectedIds = selectedIds
        makeAutoObservable(this)
      }

      @action pan = (point: number[]) => {
        this.camera.point = Vec.add(this.camera.point, point)
      }
    }

    class Page implements TLPage<BoxShape> {
      id = 'page1'
      shapes = {
        box1: {
          id: 'box1',
          type: 'box' as const,
          parentId: 'page1',
          name: 'Box',
          childIndex: 1,
          rotation: 0,
          point: [0, 0],
          size: [100, 100],
        },
      } as Record<string, BoxShape>
      bindings = {}

      constructor() {
        makeAutoObservable(this)
      }

      @action moveShape = (id: string, point: number[]) => {
        const shape = this.shapes[id]
        shape.point = point
      }
    }

    const page = new Page()
    const pageState = new PageState()

    const wrapper = render(<Renderer shapeUtils={mockUtils} page={page} pageState={pageState} />)

    expect(wrapper.getByTestId('layer')).toHaveProperty(
      'style.transform',
      `scale(1) translateX(0px) translateY(0px)`
    )

    act(() => {
      // PageState
      pageState.pan([10, 10])
    })

    expect(wrapper.getByTestId('layer')).toHaveProperty(
      'style.transform',
      `scale(1) translateX(10px) translateY(10px)`
    )

    // Page

    expect(wrapper.getByTestId('container')).toHaveProperty(
      'style.transform',
      `
    translate(
      calc(0px - var(--tl-padding)),
      calc(0px - var(--tl-padding))
    )
    rotate(0rad)`
    )

    act(() => {
      page.moveShape('box1', [10, 10])
    })

    expect(wrapper.getByTestId('container')).toHaveProperty(
      'style.transform',
      `
    translate(
      calc(10px - var(--tl-padding)),
      calc(10px - var(--tl-padding))
    )
    rotate(0rad)`
    )
  })
})
