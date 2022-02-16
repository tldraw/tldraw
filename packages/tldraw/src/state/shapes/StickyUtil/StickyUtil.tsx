/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { Utils, HTMLContainer, TLBounds } from '@tldraw/core'
import { defaultTextStyle } from '../shared/shape-styles'
import { AlignStyle, StickyShape, TDMeta, TDShapeType, TransformInfo } from '~types'
import { getBoundsRectangle, TextAreaUtils } from '../shared'
import { TDShapeUtil } from '../TDShapeUtil'
import { getStickyFontStyle, getStickyShapeStyle,getSVGFontFace, getStickyFontSize } from '../shared/shape-styles'
import { getTextAlign } from '../shared/getTextAlign'
import { styled } from '~styles'
import { Vec } from '@tldraw/vec'
import { GHOSTED_OPACITY } from '~constants'
import { TLDR } from '~state/TLDR'
import { getTextSvgElement } from '../shared/getTextSvgElement'
import { stopPropagation } from '~components/stopPropagation'

type T = StickyShape
type E = HTMLDivElement

export class StickyUtil extends TDShapeUtil<T, E> {
  type = TDShapeType.Sticky as const

  canBind = true

  canEdit = true

  canClone = true

  hideResizeHandles = true

  showCloneHandles = true

  getShape = (props: Partial<T>): T => {
    return Utils.deepMerge<T>(
      {
        id: 'id',
        type: TDShapeType.Sticky,
        name: 'Sticky',
        parentId: 'page',
        childIndex: 1,
        point: [0, 0],
        size: [200, 200],
        text: '',
        rotation: 0,
        style: defaultTextStyle,
      },
      props
    )
  }

  Component = TDShapeUtil.Component<T, E, TDMeta>(
    ({ shape, meta, events, isGhost, isBinding, isEditing, onShapeBlur, onShapeChange }, ref) => {
      const font = getStickyFontStyle(shape.style)

      const { color, fill } = getStickyShapeStyle(shape.style, meta.isDarkMode)

      const rContainer = React.useRef<HTMLDivElement>(null)

      const rTextArea = React.useRef<HTMLTextAreaElement>(null)

      const rText = React.useRef<HTMLDivElement>(null)

      const rIsMounted = React.useRef(false)

      const handlePointerDown = React.useCallback((e: React.PointerEvent) => {
        e.stopPropagation()
      }, [])

      const handleLabelChange = React.useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          onShapeChange?.({
            id: shape.id,
            type: shape.type,
            text: TLDR.normalizeText(e.currentTarget.value),
          })
        },
        [onShapeChange]
      )

      const handleKeyDown = React.useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === 'Escape') return

          if (e.key === 'Tab' && shape.text.length === 0) {
            e.preventDefault()
            return
          }

          // If this keydown was just the meta key or a shortcut
          // that includes holding the meta key like (Command+V)
          // then leave the event untouched. We also have to explicitly
          // Implement undo/redo for some reason in order to get this working
          // in the vscode extension. Without the below code the following doesn't work
          //
          // - You can't cut/copy/paste when when text-editing/focused
          // - You can't undo/redo when when text-editing/focused
          // - You can't use Command+A to select all the text, when when text-editing/focused
          if (!(e.key === 'Meta' || e.metaKey)) {
            e.stopPropagation()
          } else if (e.key === 'z' && e.metaKey) {
            if (e.shiftKey) {
              document.execCommand('redo', false)
            } else {
              document.execCommand('undo', false)
            }
            e.stopPropagation()
            e.preventDefault()
            return
          }

          if (e.key === 'Tab') {
            e.preventDefault()
            if (e.shiftKey) {
              TextAreaUtils.unindent(e.currentTarget)
            } else {
              TextAreaUtils.indent(e.currentTarget)
            }

            onShapeChange?.({ ...shape, text: TLDR.normalizeText(e.currentTarget.value) })
          }
        },
        [shape, onShapeChange]
      )

      const handleBlur = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
        e.currentTarget.setSelectionRange(0, 0)
        onShapeBlur?.()
      }, [])

      const handleFocus = React.useCallback(
        (e: React.FocusEvent<HTMLTextAreaElement>) => {
          if (!isEditing) return
          if (!rIsMounted.current) return
          e.currentTarget.select()
        },
        [isEditing]
      )

      // Focus when editing changes to true
      React.useEffect(() => {
        if (isEditing) {
          rIsMounted.current = true
          const elm = rTextArea.current!
          elm.focus()
          elm.select()
        }
      }, [isEditing])

      // Resize to fit text
      React.useEffect(() => {
        const text = rText.current!

        const { size } = shape
        const { offsetHeight: currTextHeight } = text
        const minTextHeight = MIN_CONTAINER_HEIGHT - PADDING * 2
        const prevTextHeight = size[1] - PADDING * 2

        // Same size? We can quit here
        if (currTextHeight === prevTextHeight) return

        if (currTextHeight > minTextHeight) {
          // Snap the size to the text content if the text only when the
          // text is larger than the minimum text height.
          onShapeChange?.({ id: shape.id, size: [size[0], currTextHeight + PADDING * 2] })
          return
        }

        if (currTextHeight < minTextHeight && size[1] > MIN_CONTAINER_HEIGHT) {
          // If we're smaller than the minimum height and the container
          // is too tall, snap it down to the minimum container height
          onShapeChange?.({ id: shape.id, size: [size[0], MIN_CONTAINER_HEIGHT] })
          return
        }

        const textarea = rTextArea.current
        textarea?.focus()
      }, [shape.text, shape.size[1], shape.style])

      const style = {
        font,
        color,
        textShadow: meta.isDarkMode
          ? `0.5px 0.5px 2px rgba(255, 255, 255,.25)`
          : `0.5px 0.5px 2px rgba(255, 255, 255,.5)`,
      }

      return (
        <HTMLContainer ref={ref} {...events}>
          <StyledStickyContainer
            ref={rContainer}
            isDarkMode={meta.isDarkMode}
            isGhost={isGhost}
            style={{ backgroundColor: fill, ...style }}
          >
            {isBinding && (
              <div
                className="tl-binding-indicator"
                style={{
                  position: 'absolute',
                  top: -this.bindingDistance,
                  left: -this.bindingDistance,
                  width: `calc(100% + ${this.bindingDistance * 2}px)`,
                  height: `calc(100% + ${this.bindingDistance * 2}px)`,
                  backgroundColor: 'var(--tl-selectFill)',
                }}
              />
            )}
            <StyledText ref={rText} isEditing={isEditing} alignment={shape.style.textAlign}>
              {shape.text}&#8203;
            </StyledText>
            {isEditing && (
              <StyledTextArea
                ref={rTextArea}
                onPointerDown={handlePointerDown}
                value={shape.text}
                onChange={handleLabelChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                tabIndex={-1}
                autoComplete="false"
                autoCapitalize="false"
                autoCorrect="false"
                autoSave="false"
                autoFocus
                spellCheck={true}
                alignment={shape.style.textAlign}
                onContextMenu={stopPropagation}
              />
            )}
          </StyledStickyContainer>
        </HTMLContainer>
      )
    }
  )

  Indicator = TDShapeUtil.Indicator<T>(({ shape }) => {
    const {
      size: [width, height],
    } = shape

    return (
      <rect x={0} y={0} rx={3} ry={3} width={Math.max(1, width)} height={Math.max(1, height)} />
    )
  })

  getBounds = (shape: T) => {
    return getBoundsRectangle(shape, this.boundsCache)
  }

  shouldRender = (prev: T, next: T) => {
    return next.size !== prev.size || next.style !== prev.style || next.text !== prev.text
  }

  transform = (
    shape: T,
    bounds: TLBounds,
    { scaleX, scaleY, transformOrigin }: TransformInfo<T>
  ): Partial<T> => {
    const point = Vec.toFixed([
      bounds.minX +
        (bounds.width - shape.size[0]) * (scaleX < 0 ? 1 - transformOrigin[0] : transformOrigin[0]),
      bounds.minY +
        (bounds.height - shape.size[1]) *
          (scaleY < 0 ? 1 - transformOrigin[1] : transformOrigin[1]),
    ])

    return {
      point,
    }
  }

  transformSingle = (shape: T): Partial<T> => {
    return shape
  }

  getSvgElement = (shape: T): SVGElement | void => {
    const dropShadowPadding = { left: 4, top: 4, right: 4, bottom: 4 };
    
    const style = getStickyShapeStyle(shape.style)
    const fontSize = getStickyFontSize(shape.style.size)
    const fontFamily = getSVGFontFace(shape.style.font)
    const textAlign = getTextAlign(shape.style.textAlign)

    const measurementElement = getMeasurementElement();
    measurementElement.style.fontFamily = fontFamily;
    measurementElement.style.fontSize = measurementElement.style.lineHeight = `${fontSize.toString()}px`;
    measurementElement.style.textAlign = textAlign;


    // const bounds = this.getBounds(shape)
    // const textBounds = Utils.expandBounds(bounds, -PADDING)
    // const textElm = getTextSvgElement(shape.text, shape.style, textBounds)
    
    // const fontStyle = getStickyFontStyle(shape.style)
    // textElm.setAttribute('fill', style.color)
    // textElm.setAttribute('transform', `translate(${PADDING}, ${PADDING})`)

    // const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    // const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    // rect.setAttribute('width', bounds.width + '')
    // rect.setAttribute('height', bounds.height + '')
    // rect.setAttribute('fill', style.fill)
    // rect.setAttribute('rx', '3')
    // rect.setAttribute('ry', '3')

    // g.appendChild(rect)
    // g.appendChild(textElm)

    measurementElement.innerHTML = adjustTextForInnerHTML(
      shape.text
    );
    const layout = computeLayout(measurementElement);


    
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute('font-size', fontSize + '')
    g.setAttribute('font-family', fontFamily)
    g.setAttribute('text-align', textAlign)
    // g.setAttribute("font-size", "24px");

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    rect.setAttribute("width", "200px");
    rect.setAttribute("height", `${Math.max(200,layout.height)}px`);
    rect.setAttribute("fill", "rgb(253, 223, 142)");
    rect.setAttribute("rx", "3px");
    // rect.setAttribute("x", `${dropShadowPadding.left}px`);
    // rect.setAttribute("y", `${dropShadowPadding.top}px`);
    rect.setAttribute("style", "filter:url(#sticky-drop-shadow)");
    g.appendChild(rect);

    if (layout.lines.length) {
      layout.lines.forEach((line) => {
        const text = document.createElementNS(  
          "http://www.w3.org/2000/svg",
          "text"
        );
        
        text.setAttribute("x", `${line.left}px`);
        // 24 is magic number. we need to analyze why it works
        text.setAttribute("y", `${line.top+ fontSize}`);
        text.setAttribute('fill', style.color)

        text.textContent = line.text;

        g.appendChild(text);
      });
    }

    return g;
  }
}

function getMeasurementElement (): HTMLDivElement {
  // A div used for measurement
  document.getElementById('__stickyMeasure')?.remove()

  const stickyMeasurer = document.createElement('div')
  stickyMeasurer.id = '__stickyMeasure'
  stickyMeasurer.setAttribute('contenteditable', 'true')

  Object.assign(stickyMeasurer.style, {
    display: 'block',
    width: '200px',
    minHeight: '200px',
    boxShadow: "rgb(0 0 0 / 20%) 2px 3px 12px -2px, rgb(0 0 0 / 16%) 1px 1px 4px",
    borderRadius: "3px",
    backgroundColor: "rgb(253, 223, 142)",
    padding: "16px",
  })

  stickyMeasurer.tabIndex = -1

  
  // document.body.appendChild(stickyMeasurer)
  // TODO: Comment me out, and uncomment line above
  document.getElementById('home')?.appendChild(stickyMeasurer)
  // setTimeout(()=>{
    const canvas = document.getElementById('home');
    if(canvas && canvas.children[0]){
      canvas.children[0].style.opacity = "0.5"
    }
    const tlMenu = document.getElementById('TD-MenuPanel');
    if(tlMenu){
      tlMenu.style.display = 'none'
    }
    
  // },1000)

  return stickyMeasurer
}

function adjustTextForInnerHTML(text:string) {
  let adjusted = text;

  // HACK: Why we need to add an extra line, I don't follow.
  if (adjusted.length && adjusted[adjusted.length - 1] === "\n") {
    adjusted += "\n";
  }

  adjusted = adjusted.replace(/ /g, " ").replace(/\n/g, "<br>");

  return adjusted;
}

interface StickyLayoutLine {
  left: number
  top: number
  right: number
  bottom: number
  text: string
}
interface StickyLayout {
  height: number
  lines: StickyLayoutLine[]
}


// Returns an array of lines of text and their layout information.
function computeLayout(contentEditable:HTMLSpanElement):StickyLayout{
  
  const children = contentEditable.childNodes;
  const computedStyle = window.getComputedStyle(contentEditable);
  const textAlign = computedStyle.textAlign;
  const fontSize = parseFloat(computedStyle.fontSize);
  const nbspWidth = (5 * fontSize) / 24.0;
  
  const layout:StickyLayout = {height: 0,lines: []};

  const bounds = contentEditable.getBoundingClientRect();
  const offsetX = bounds.x;
  const offsetY = bounds.y;

  for (const child of Array.from(children)) {
    const textNode = (child.firstChild || child) as Element;
    const spanText = textNode?.textContent;
    let last:StickyLayoutLine | undefined;

    if (spanText && textNode.getBoundingClientRect) {
        const text = spanText.replace(/ /g, "&nbsp;");
      const textBounds = textNode.getBoundingClientRect();
      const line:StickyLayoutLine = {
        left: textBounds.x - offsetX,
        top: textBounds.y - offsetY,
        right: textBounds.x - offsetX + textBounds.width,
        bottom: textBounds.y - offsetY + textBounds.height,
        text,
      };

      if (textAlign === "right") {
        line.left = line.right - textBounds.width;
      } else if (textAlign === "center") {
        line.left = line.left + (line.right - line.left - textBounds.width) / 2;
      }

      if (last) {
        last.bottom = Math.max(last.bottom, line.bottom);
      } else {
        layout.height = Math.max(layout.height, line.bottom);
      }

      layout.lines.push(line);
      last = line;
    }
  

    // It's nice to be able to select and copy/paste text from
    // sticky notes in the outputted SVG. We create empty text elements
    // to represent newlines otherwise selected text will drop blank newlines.
    // We can't create newlines in text nodes, so we have to compromise and use
    // spaces as placeholders. So this means copied text will have extra spaces in them.
    // This seems like a better option than dropping newlines as pasted text will look
    // more like the source.
    if (textNode.nodeName === "BR" && last !== undefined) {
      console.log(last.text);
      last = {
        top: last.top + fontSize,
        right: getLeftOfNewlines(textAlign, nbspWidth) + nbspWidth,
        bottom: last.bottom + fontSize,
        left: getLeftOfNewlines(textAlign, nbspWidth),
        // text: " "
        text: "&nbsp;"
      };
      layout.lines.push(last);
      console.log("br");
    }
    if (!textNode || !spanText) {
      console.warn(`TEXT is NULL`);
      continue;
    }

    const range = document.createRange();
    const points = Array.from(spanText);
    console.log(points);
    let i = 0;
    
    for (const text of points) {
      range.setStart(textNode, i);
      range.setEnd(textNode, (i += text.length));

      const rect =
        Array.from(range.getClientRects()).find(({ width }) => width > 0) ??
        range.getBoundingClientRect();
      const top = truncateToHundredths(rect.top - offsetY);
      const right = truncateToHundredths(rect.right - offsetX);
      const bottom = truncateToHundredths(rect.bottom - offsetY);
      const left = truncateToHundredths(rect.left - offsetX);
      if (last && last.top === top && last.bottom === bottom) {
        last.right = right;
        last.text += text;
      } else {
        last = { top, right, bottom, left, text };
        layout.lines.push(last);
      }
    }
  }

  const finalBounds = contentEditable.getBoundingClientRect();

  layout.lines.forEach((line) => {
    line.text = line.text.replace(/&nbsp;/g, " ");
  });

  layout.height = finalBounds.height
  console.log(layout);
  return layout
}

const truncateToHundredths = (num:number):number =>{
  return parseFloat(num.toFixed(2));
}

// Placeholders for newlines should be positioned correctly based on the text
// text alignment. This just calculates that.
const getLeftOfNewlines = (textAlign:string, nbspWidth:number):number => {
  // debugger;
  switch (textAlign) {
    case "left":
    case "justify":
      return 16;
    case "center":
      return 168 / 2 - nbspWidth + 16;
    case "right":
      return 168 - nbspWidth + 16;
    default:
      throw new Error(`Unknown textAlign: ${textAlign}`);
  }
}


/* -------------------------------------------------- */
/*                       Helpers                      */
/* -------------------------------------------------- */

const PADDING = 16
const MIN_CONTAINER_HEIGHT = 200

const StyledStickyContainer = styled('div', {
  pointerEvents: 'all',
  position: 'relative',
  backgroundColor: 'rgba(255, 220, 100)',
  fontFamily: 'sans-serif',
  height: '100%',
  width: '100%',
  padding: PADDING + 'px',
  borderRadius: '3px',
  perspective: '800px',
  variants: {
    isGhost: {
      false: { opacity: 1 },
      true: { transition: 'opacity .2s', opacity: GHOSTED_OPACITY },
    },
    isDarkMode: {
      true: {
        boxShadow:
          '2px 3px 12px -2px rgba(0,0,0,.3), 1px 1px 4px rgba(0,0,0,.3), 1px 1px 2px rgba(0,0,0,.3)',
      },
      false: {
        boxShadow:
          '2px 3px 12px -2px rgba(0,0,0,.2), 1px 1px 4px rgba(0,0,0,.16),  1px 1px 2px rgba(0,0,0,.16)',
      },
    },
  },
})

const commonTextWrapping = {
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
}

const StyledText = styled('div', {
  position: 'absolute',
  top: PADDING,
  left: PADDING,
  width: `calc(100% - ${PADDING * 2}px)`,
  height: 'fit-content',
  font: 'inherit',
  pointerEvents: 'none',
  userSelect: 'none',
  variants: {
    isEditing: {
      true: {
        opacity: 1,
      },
      false: {
        opacity: 1,
      },
    },
    alignment: {
      [AlignStyle.Start]: {
        textAlign: 'left',
      },
      [AlignStyle.Middle]: {
        textAlign: 'center',
      },
      [AlignStyle.End]: {
        textAlign: 'right',
      },
      [AlignStyle.Justify]: {
        textAlign: 'justify',
      },
    },
  },
  ...commonTextWrapping,
})

const StyledTextArea = styled('textarea', {
  width: '100%',
  height: '100%',
  border: 'none',
  overflow: 'hidden',
  background: 'none',
  outline: 'none',
  textAlign: 'left',
  font: 'inherit',
  padding: 0,
  color: 'transparent',
  verticalAlign: 'top',
  resize: 'none',
  caretColor: 'black',
  ...commonTextWrapping,
  variants: {
    alignment: {
      [AlignStyle.Start]: {
        textAlign: 'left',
      },
      [AlignStyle.Middle]: {
        textAlign: 'center',
      },
      [AlignStyle.End]: {
        textAlign: 'right',
      },
      [AlignStyle.Justify]: {
        textAlign: 'justify',
      },
    },
  },
})
