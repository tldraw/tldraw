import { TLDraw } from '@tldraw/tldraw';
import * as React from 'react';
export default function Embedded() {
    return (<div style={{ padding: '2% 10%', width: 'calc(100% - 100px)' }}>
      <div style={{
            position: 'relative',
            width: 'auto',
            height: '500px',
            overflow: 'hidden',
        }}>
        <TLDraw id="small1"/>
      </div>

      <div style={{
            position: 'relative',
            width: 'auto',
            height: '500px',
            overflow: 'hidden',
        }}>
        <TLDraw id="small2"/>
      </div>
    </div>);
}
//# sourceMappingURL=embedded.jsx.map