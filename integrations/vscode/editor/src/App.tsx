import {useRef, useEffect, useCallback, useState} from "react";
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

// const initialDocument: TLDrawDocument = {
//   id: "doc",
//   pages: {
//     page1: {
//       id: "page1",
//       shapes: {
//         rect1: {
//           id: "rect1",
//           type: TLDrawShapeType.Rectangle,
//           parentId: "page1",
//           name: "Rectangle",
//           childIndex: 1,
//           point: [0, 0],
//           size: [100, 100],
//           style: {
//             dash: DashStyle.Draw,
//             size: SizeStyle.Medium,
//             color: ColorStyle.Blue
//           }
//         },
//         rect2: {
//           id: "rect2",
//           parentId: "page1",
//           name: "Rectangle",
//           childIndex: 2,
//           type: TLDrawShapeType.Rectangle,
//           point: [200, 200],
//           size: [100, 100],
//           style: {
//             dash: DashStyle.Draw,
//             size: SizeStyle.Medium,
//             color: ColorStyle.Blue
//           }
//         }
//       },
//       bindings: {}
//     }
//   },
//   pageStates: {
//     page1: {
//       id: "page1",
//       selectedIds: [],
//       camera: {
//         point: [0, 0],
//         zoom: 1
//       }
//     }
//   }
// };

// console.log("Here")
// console.log(JSON.stringify( initialDocument, null, "    " ));

function postMessage(type:any,text:any = undefined){
  // Notify extension that something has changed. This ends up being called by
  // the history execute/redo/undo commands, so we put this here.
  //console.log(`"update" (webview <- iframe)`)
  if (window.self !== window.top) {
    window.parent.postMessage(
      {
        type,
        text
      },
      '*'
    )
  }
}

export default function App() {
  const [initialDocument, setInitialDocument] = useState(undefined);

  useEffect(()=>{
    const onKeyDown = (event: KeyboardEvent) => {
      if(event.key === "s" && event.metaKey=== true){
        console.log(event);
        postMessage('save');
      }
    };
    document.addEventListener('keydown', onKeyDown);

    if (window.self !== window.top) {
      window.onmessage = function (e) {
        if (e.data.type === 'load') {
          setInitialDocument(JSON.parse(e.data.text));
        }
      }
    }
    return ()=>{
      document.removeEventListener('keydown', onKeyDown); 
    }
  },[])

  const rTLDrawState = useRef<TLDrawState>();

  const handleMount = useCallback((tldr: TLDrawState) => {
    rTLDrawState.current = tldr;
  }, []);

  const handleChange = useCallback((tldr: TLDrawState, type: string) => {
    // TODO: Think more about if syncing on only "command" is the way to go
    if(type === "command"){
      console.log("changed");

      postMessage( 'update', tldr.toJson() );
    }
    
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
        {initialDocument===undefined ? undefined : <TLDraw document={initialDocument} onMount={handleMount} onChange={handleChange} />}
      </div>
    </div>
  );
}
