export declare function getInstance(): any;
/**
 * -> normal proxy
 * => router
 * ~> pathRewrite
 * ≈> router + pathRewrite
 *
 * @param  {String} originalPath
 * @param  {String} newPath
 * @param  {String} originalTarget
 * @param  {String} newTarget
 * @return {String}
 */
export declare function getArrow(originalPath: any, newPath: any, originalTarget: any, newTarget: any): string;
