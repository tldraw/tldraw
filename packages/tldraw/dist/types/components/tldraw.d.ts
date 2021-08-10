/// <reference types="react" />
import type { TLDrawDocument } from '../types';
import { TLDrawState } from '../state';
export interface TLDrawProps {
    document?: TLDrawDocument;
    currentPageId?: string;
    onMount?: (state: TLDrawState) => void;
    onChange?: TLDrawState['_onChange'];
}
export declare function TLDraw({ document, currentPageId, onMount, onChange: _onChange, }: TLDrawProps): JSX.Element;
