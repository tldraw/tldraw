import * as React from 'react'
import type { TLShapeUtil } from '~TLShapeUtil'
import { BoxUtil, boxShape } from '~TLShapeUtil/TLShapeUtil.spec'
import { renderWithContext } from '~test'
import type { TLShape } from '~types'
import { Shape } from './Shape'

describe('shape', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <Shape
        shape={boxShape}
        utils={new BoxUtil() as unknown as TLShapeUtil<TLShape>}
        isEditing={false}
        isBinding={false}
        isHovered={false}
        isSelected={false}
        isGhost={false}
        isChildOfSelected={false}
      />
    )
  })
})
