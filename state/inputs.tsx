import { PointerInfo } from "types"
import { isDarwin } from "utils/utils"

class Inputs {
  points: Record<string, PointerInfo> = {}

  pointerDown(e: PointerEvent | React.PointerEvent, target: string) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const info = {
      target,
      pointerId: e.pointerId,
      origin: [e.clientX, e.clientY],
      point: [e.clientX, e.clientY],
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    this.points[e.pointerId] = info

    return info
  }

  pointerEnter(e: PointerEvent | React.PointerEvent, target: string) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const info = {
      target,
      pointerId: e.pointerId,
      origin: [e.clientX, e.clientY],
      point: [e.clientX, e.clientY],
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    return info
  }

  pointerMove(e: PointerEvent | React.PointerEvent) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const prev = this.points[e.pointerId]

    const info = {
      ...prev,
      pointerId: e.pointerId,
      point: [e.clientX, e.clientY],
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    if (this.points[e.pointerId]) {
      this.points[e.pointerId] = info
    }

    return info
  }

  pointerUp(e: PointerEvent | React.PointerEvent) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    const prev = this.points[e.pointerId]

    const info = {
      ...prev,
      origin: prev?.origin || [e.clientX, e.clientY],
      point: [e.clientX, e.clientY],
      shiftKey,
      ctrlKey,
      metaKey: isDarwin() ? metaKey : ctrlKey,
      altKey,
    }

    delete this.points[e.pointerId]

    return info
  }

  wheel(e: WheelEvent) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e
    return { point: [e.clientX, e.clientY], shiftKey, ctrlKey, metaKey, altKey }
  }
}

export default new Inputs()
