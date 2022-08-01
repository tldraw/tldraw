import * as React from 'react'
import { Utils, SVGContainer } from '@tldraw/core'
import {DashStyle, TDShapeType, TDMeta, ViewZoneShape, ColorStyle, SizeStyle, MoveType} from '~types'
import { GHOSTED_OPACITY, LABEL_POINT } from '~constants'
import { TDShapeUtil } from '../TDShapeUtil'
import {
  getShapeStyle,
  getBoundsRectangle,
  transformRectangle,
  getFontStyle,
  transformSingleRectangle,
} from '~state/shapes/shared'
import { TextLabel } from '../shared/TextLabel'
import { getRectangleIndicatorPathTDSnapshot } from './viewzoneHelpers'
import { DrawRectangle } from './components/DrawRectangle'
import { BindingIndicator } from './components/BindingIndicator'
import { styled } from '~styles'
import {TldrawApp} from "~state";
import * as Commands from "~state/commands";
import {useTldrawApp} from "~hooks";

type T = ViewZoneShape
type E = HTMLDivElement

export class ViewZoneUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.ViewZone as const

  canBind = true

  canClone = true

  canEdit = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TDShapeType.ViewZone,
        name: 'ViewZone',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [1, 1],
        rotation: 0,
        style: {
          color: ColorStyle.Black,
          size: SizeStyle.Small,
          isFilled: true,
          dash: DashStyle.Draw,
          scale: 1
        },
        label: '',
        labelPoint: [0.5, 0.5],
      },
      props
    )
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(
    (
      {
        shape,
        isEditing,
        isBinding,
        isSelected,
        isGhost,
        meta,
        bounds,
        events,
        onShapeBlur,
        onShapeChange,
      },
      ref
    ) => {
      const { id, size, style, label = '', labelPoint = LABEL_POINT } = shape
      const font = getFontStyle(style)
      const styles = {
        fill: "#e3e5e7",
        stroke: "#0000ffff",
        strokeWidth: 0
      }
      const Component = DrawRectangle
      const handleLabelChange = React.useCallback(
        (label: string) => onShapeChange?.({ id, label }),
        [onShapeChange]
      )
      const app = useTldrawApp()

      // Add shadow to view zones
      React.useEffect(() => {
        document.getElementById(shape.id + '_svg')!.style.filter = 'drop-shadow(2px 3px 12px rgba(0,0,0,.3))'
        app.moveToBack()
      }, [])

      return (
        <FullWrapper ref={ref} {...events}>
          <TextLabel
            isEditing={isEditing}
            onChange={handleLabelChange}
            onBlur={onShapeBlur}
            font={font}
            text={label}
            color={styles.stroke}
            offsetX={(labelPoint[0] - 0.5) * bounds.width}
            offsetY={(labelPoint[1] - 0.5) * bounds.height}
          />
          <SVGContainer id={shape.id + '_svg'} className={'viewzone'} opacity={isGhost ? GHOSTED_OPACITY : 1}>
            {isBinding && <BindingIndicator strokeWidth={styles.strokeWidth} size={size}/>}
              <Component
                id={id}
                style={style}
                size={size}
                isSelected={isSelected}
                isDarkMode={meta.isDarkMode}
              />
          </SVGContainer>
        </FullWrapper>
      )
    }
  )

  Indicator = TDShapeUtil.Indicator<T>(({ shape }) => {
    const { id, style, size } = shape

    const styles = getShapeStyle(style, false)
    const sw = styles.strokeWidth

    if (style.dash === DashStyle.Draw) {
      return <path d={getRectangleIndicatorPathTDSnapshot(id, style, size)} />
    }

    return (
      <rect
        x={sw}
        y={sw}
        rx={1}
        ry={1}
        width={Math.max(1, size[0] - sw * 2)}
        height={Math.max(1, size[1] - sw * 2)}
      />
    )
  })

  getBounds = (shape: T) => {
    return getBoundsRectangle(shape, this.boundsCache)
  }

  shouldRender = (prev: T, next: T) => {
    return next.size !== prev.size || next.style !== prev.style || next.label !== prev.label
  }

  transform = transformRectangle

  transformSingle = transformSingleRectangle
}

const FullWrapper = styled('div', {
  width: '100%',
  height: '100%',
})
