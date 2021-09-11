import * as React from 'react'
import { mockUtils, renderWithSvg } from '+test'
import { Shape } from './shape'

describe('shape', () => {
  test('mounts component without crashing', () => {
    renderWithSvg(
      <Shape
        shape={mockUtils.box.create({ id: 'box' })}
        utils={mockUtils[mockUtils.box.type]}
        isEditing={false}
        isBinding={false}
        isHovered={false}
        isSelected={false}
        isCurrentParent={false}
      />
    )
  })
})

// { shape: TLShape; ref: ForwardedRef<Element>; } & TLRenderInfo<any, any> & RefAttributes<Element>
// { shape: BoxShape; ref: ForwardedRef<any>; } & TLRenderInfo<any, any> & RefAttributes<any>'
