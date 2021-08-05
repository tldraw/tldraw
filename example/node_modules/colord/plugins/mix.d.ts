import { AnyColor } from "../types";
import { Plugin } from "../extend";
declare module "../colord" {
    interface Colord {
        /**
         * Produces a mixture of two colors through CIE LAB color space and returns a new Colord instance.
         */
        mix(color2: AnyColor | Colord, ratio?: number): Colord;
    }
}
/**
 * A plugin adding a color mixing utility.
 */
declare const mixPlugin: Plugin;
export default mixPlugin;
