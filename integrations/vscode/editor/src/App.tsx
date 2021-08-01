import * as React from "react";
import "./styles.css";
import {
  ColorStyle,
  DashStyle,
  SizeStyle,
  TLDraw,
  TLDrawDocument,
  TLDrawState,
  TLDrawShapeType
} from "@tldraw/tldraw";

const initialDocument: TLDrawDocument = {
  id: "doc",
  pages: {
    page1: {
      id: "page1",
      shapes: {
        rect1: {
          id: "rect1",
          type: TLDrawShapeType.Rectangle,
          parentId: "page1",
          name: "Rectangle",
          childIndex: 1,
          point: [0, 0],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue
          }
        },
        rect2: {
          id: "rect2",
          parentId: "page1",
          name: "Rectangle",
          childIndex: 2,
          type: TLDrawShapeType.Rectangle,
          point: [200, 200],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue
          }
        }
      },
      bindings: {}
    }
  },
  pageStates: {
    page1: {
      id: "page1",
      selectedIds: [],
      camera: {
        point: [0, 0],
        zoom: 1
      }
    }
  }
};

export default function App() {
  const rTLDrawState = React.useRef<TLDrawState>();

  const handleMount = React.useCallback((tldr: TLDrawState) => {
    rTLDrawState.current = tldr;
  }, []);

  function handleClick() {
    const tldr = rTLDrawState.current;
    if (!tldr) return;
    tldr.state.send("SELECTED_ALL");
  }

  return (
    <div className="App">
      <button
        style={{ position: "absolute", zIndex: 999 }}
        onClick={handleClick}
      >
        Select All
      </button>
      <div>
        <TLDraw document={initialDocument} onMount={handleMount} />
      </div>
    </div>
  );
}
