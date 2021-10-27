import * as React from 'react'
import { mockUtils, renderWithContext } from '+test'
import { Shape } from './shape'

describe('shape', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
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

// { shape: TLShape; ref: ForwardedRef<Element>; } & TLComponentProps<any, any> & RefAttributes<Element>
// { shape: BoxShape; ref: ForwardedRef<any>; } & TLComponentProps<any, any> & RefAttributes<any>'
