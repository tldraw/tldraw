import { PointerInfo } from "types"

class Inputs {
  points: Record<string, PointerInfo> = {}

  pointerDown(e: PointerEvent | React.PointerEvent) {
    const { shiftKey, ctrlKey, metaKey, altKey } = e

    this.points[e.pointerId] = {
      pointerId: e.pointerId,
      origin: [e.clientX, e.clientY],
      point: [e.clientX, e.clientY],
      shiftKey,
      ctrlKey,
      metaKey,
      altKey,
    }

    return this.points[e.pointerId]
  }

  pointerMove(e: PointerEvent | React.PointerEvent) {
    if (this.points[e.pointerId]) {
      this.points[e.pointerId].point = [e.clientX, e.clientY]
      return this.points[e.pointerId]
    }

    const { shiftKey, ctrlKey, metaKey, altKey } = e

    return {
      pointerId: e.pointerId,
      origin: [e.clientX, e.clientY],
      point: [e.clientX, e.clientY],
      shiftKey,
      ctrlKey,
      metaKey,
      altKey,
    }
  }

  pointerUp(e: PointerEvent | React.PointerEvent) {
    this.points[e.pointerId].point = [e.clientX, e.clientY]

    const info = this.points[e.pointerId]

    delete this.points[e.pointerId]

    return info
  }
}

export default new Inputs()
