import { useRef, useEffect, useCallback, useState } from "react";
import "./styles.css";
import { TLDraw, TLDrawState, Data } from "@tldraw/tldraw";

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

// HACK: Look more deeply into how to do this properly.
// vscode/types doesn't include this globally available function.
// Used this approach to resolve that. 
// https://stackoverflow.com/a/54729526
declare const acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();


function postMessage(type:any,text:any = undefined){
  // Notify extension that something has changed. This ends up being called by
  // the history execute/redo/undo commands, so we put this here.
  //console.log(`"update" (webview <- iframe)`)
  //console.log('post-message');
  
  if (window.self !== window.top) {
    vscode.postMessage({
      type,
      text
    })
  }
}

export default function App() {
  const [initialDocument, setInitialDocument] = useState(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  //throw new Error("hi!")
  useEffect(()=>{
    const onKeyDown = (event: KeyboardEvent) => {
      if(event.key === "s" && event.metaKey=== true){
        console.log(event);
        postMessage('save');
      }
    };
    document.addEventListener('keydown', onKeyDown);

    if (window.self !== window.top) {
      window.onmessage = function (e:any) {
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
    containerRef.current?.focus();
  }, []);

  if(initialDocument!==undefined){
    const i = 1000;
  }

  const handleChange = useCallback((tldr: TLDrawState, data:Date, type: string) => {
    if(type.search("command:")=== 0){
      console.log("Action");
      console.log(type);
      postMessage( 'update', JSON.stringify(tldr.document) );
    } else {
      console.log("Change")
      console.log(type);
    }
    // TODO: Think more about if syncing on only "command" is the way to go
    //console.log(type);
    // if(type.search("command") !== -1){
    //   //console.log("changed");

    //  postMessage( 'update', tldr.document );
    // }
    //console.log(`update: ${type}`);
    //console.log(JSON.stringify(tldr.document,null, "    "));
    
  }, []);


  return <div ref={containerRef} className="App">
      <div>
        {initialDocument===undefined ? undefined : <TLDraw document={initialDocument} onMount={handleMount} onChange={handleChange} />}
        {/* <TLDraw onMount={handleMount} onChange={handleChange} /> */}
      </div>
    </div>
}
