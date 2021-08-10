/// <reference types="react" />
import type { TLShapeUtil, TLRenderInfo, TLShape } from '../../../types';
interface EditingShapeProps<T extends TLShape> extends TLRenderInfo {
    shape: T;
    utils: TLShapeUtil<T>;
}
export declare function EditingTextShape({ shape, utils, isEditing, isBinding, isDarkMode, isCurrentParent, }: EditingShapeProps<TLShape>): JSX.Element;
export {};
