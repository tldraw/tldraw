import * as postcss from "postcss";
interface RawContent<T = string> {
    extension: string;
    raw: T;
}
interface RawCSS {
    raw: string;
}
interface ExtractorResultDetailed {
    attributes: {
        names: string[];
        values: string[];
    };
    classes: string[];
    ids: string[];
    tags: string[];
    undetermined: string[];
}
type ExtractorResult = ExtractorResultDetailed | string[];
type ExtractorFunction<T = string> = (content: T) => ExtractorResult;
interface Extractors {
    extensions: string[];
    extractor: ExtractorFunction;
}
type StringRegExpArray = Array<RegExp | string>;
type ComplexSafelist = {
    standard?: StringRegExpArray;
    deep?: RegExp[];
    greedy?: RegExp[];
    variables?: StringRegExpArray;
    keyframes?: StringRegExpArray;
};
type UserDefinedSafelist = StringRegExpArray | ComplexSafelist;
interface UserDefinedOptions {
    content: Array<string | RawContent>;
    css: Array<string | RawCSS>;
    defaultExtractor?: ExtractorFunction;
    extractors?: Array<Extractors>;
    fontFace?: boolean;
    keyframes?: boolean;
    output?: string;
    rejected?: boolean;
    stdin?: boolean;
    stdout?: boolean;
    variables?: boolean;
    safelist?: UserDefinedSafelist;
    blocklist?: StringRegExpArray;
    skippedContentGlobs?: Array<string>;
    dynamicAttributes?: string[];
}
interface Options {
    content: Array<string | RawContent>;
    css: Array<string | RawCSS>;
    defaultExtractor: ExtractorFunction;
    extractors: Array<Extractors>;
    fontFace: boolean;
    keyframes: boolean;
    output?: string;
    rejected: boolean;
    stdin: boolean;
    stdout: boolean;
    variables: boolean;
    safelist: Required<ComplexSafelist>;
    blocklist: StringRegExpArray;
    skippedContentGlobs: Array<string>;
    dynamicAttributes: string[];
}
interface ResultPurge {
    css: string;
    file?: string;
    rejected?: string[];
}
declare class ExtractorResultSets {
    private undetermined;
    private attrNames;
    private attrValues;
    private classes;
    private ids;
    private tags;
    constructor(er: ExtractorResult);
    merge(that: ExtractorResult | ExtractorResultSets): this;
    hasAttrName(name: string): boolean;
    private someAttrValue;
    hasAttrPrefix(prefix: string): boolean;
    hasAttrSuffix(suffix: string): boolean;
    hasAttrSubstr(substr: string): boolean;
    hasAttrValue(value: string): boolean;
    hasClass(name: string): boolean;
    hasId(id: string): boolean;
    hasTag(tag: string): boolean;
}
declare const defaultOptions: Options;
declare function standardizeSafelist(userDefinedSafelist?: UserDefinedSafelist): Required<ComplexSafelist>;
/**
 * Load the configuration file from the path
 * @param configFile Path of the config file
 */
declare function setOptions(configFile?: string): Promise<Options>;
/**
 * Merge two extractor selectors
 * @param extractorSelectorsA extractor selectors A
 * @param extractorSelectorsB extractor selectors B
 */
declare function mergeExtractorSelectors(...extractors: (ExtractorResultDetailed | ExtractorResultSets)[]): ExtractorResultSets;
declare class PurgeCSS {
    private ignore;
    private atRules;
    private usedAnimations;
    private usedFontFaces;
    selectorsRemoved: Set<string>;
    private variablesStructure;
    options: Options;
    private collectDeclarationsData;
    /**
     * Get the extractor corresponding to the extension file
     * @param filename Name of the file
     * @param extractors Array of extractors definition
     */
    /**
     * Get the extractor corresponding to the extension file
     * @param filename Name of the file
     * @param extractors Array of extractors definition
     */
    private getFileExtractor;
    /**
     * Extract the selectors present in the files using a purgecss extractor
     * @param files Array of files path or glob pattern
     * @param extractors Array of extractors
     */
    /**
     * Extract the selectors present in the files using a purgecss extractor
     * @param files Array of files path or glob pattern
     * @param extractors Array of extractors
     */
    extractSelectorsFromFiles(files: string[], extractors: Extractors[]): Promise<ExtractorResultSets>;
    /**
     * Extract the selectors present in the passed string using a PurgeCSS extractor
     * @param content Array of content
     * @param extractors Array of extractors
     */
    /**
     * Extract the selectors present in the passed string using a PurgeCSS extractor
     * @param content Array of content
     * @param extractors Array of extractors
     */
    extractSelectorsFromString(content: RawContent[], extractors: Extractors[]): Promise<ExtractorResultSets>;
    /**
     * Evaluate at-rule and register it for future reference
     * @param node node of postcss AST
     */
    /**
     * Evaluate at-rule and register it for future reference
     * @param node node of postcss AST
     */
    private evaluateAtRule;
    /**
     * Evaluate css selector and decide if it should be removed or not
     * @param node node of postcss AST
     * @param selectors selectors used in content files
     */
    /**
     * Evaluate css selector and decide if it should be removed or not
     * @param node node of postcss AST
     * @param selectors selectors used in content files
     */
    private evaluateRule;
    /**
     * Get the purged version of the css based on the files
     * @param cssOptions css options, files or raw strings
     * @param selectors set of extracted css selectors
     */
    /**
     * Get the purged version of the css based on the files
     * @param cssOptions css options, files or raw strings
     * @param selectors set of extracted css selectors
     */
    getPurgedCSS(cssOptions: Array<string | RawCSS>, selectors: ExtractorResultSets): Promise<ResultPurge[]>;
    /**
     * Check if the keyframe is safelisted with the option safelist keyframes
     * @param keyframesName name of the keyframe animation
     */
    /**
     * Check if the keyframe is safelisted with the option safelist keyframes
     * @param keyframesName name of the keyframe animation
     */
    private isKeyframesSafelisted;
    /**
     * Check if the selector is blocklisted with the option blocklist
     * @param selector css selector
     */
    /**
     * Check if the selector is blocklisted with the option blocklist
     * @param selector css selector
     */
    private isSelectorBlocklisted;
    /**
     * Check if the selector is safelisted with the option safelist standard
     * @param selector css selector
     */
    /**
     * Check if the selector is safelisted with the option safelist standard
     * @param selector css selector
     */
    private isSelectorSafelisted;
    /**
     * Check if the selector is safelisted with the option safelist deep
     * @param selector selector
     */
    /**
     * Check if the selector is safelisted with the option safelist deep
     * @param selector selector
     */
    private isSelectorSafelistedDeep;
    /**
     * Check if the selector is safelisted with the option safelist greedy
     * @param selector selector
     */
    /**
     * Check if the selector is safelisted with the option safelist greedy
     * @param selector selector
     */
    private isSelectorSafelistedGreedy;
    /**
     * Remove unused css
     * @param userOptions PurgeCSS options
     */
    /**
     * Remove unused css
     * @param userOptions PurgeCSS options
     */
    purge(userOptions: UserDefinedOptions | string | undefined): Promise<ResultPurge[]>;
    /**
     * Remove unused CSS variables
     */
    /**
     * Remove unused CSS variables
     */
    removeUnusedCSSVariables(): void;
    /**
     * Remove unused font-faces
     */
    /**
     * Remove unused font-faces
     */
    removeUnusedFontFaces(): void;
    /**
     * Remove unused keyframes
     */
    /**
     * Remove unused keyframes
     */
    removeUnusedKeyframes(): void;
    /**
     * Transform a selector node into a string
     */
    /**
     * Transform a selector node into a string
     */
    private getSelectorValue;
    /**
     * Determine if the selector should be kept, based on the selectors found in the files
     * @param selector set of css selectors found in the content files or string
     * @param selectorsFromExtractor selectors in the css rule
     */
    /**
     * Determine if the selector should be kept, based on the selectors found in the files
     * @param selector set of css selectors found in the content files or string
     * @param selectorsFromExtractor selectors in the css rule
     */
    private shouldKeepSelector;
    /**
     * Walk through the CSS AST and remove unused CSS
     * @param root root node of the postcss AST
     * @param selectors selectors used in content files
     */
    /**
     * Walk through the CSS AST and remove unused CSS
     * @param root root node of the postcss AST
     * @param selectors selectors used in content files
     */
    walkThroughCSS(root: postcss.Root, selectors: ExtractorResultSets): void;
}
export { PurgeCSS as default, PurgeCSS, defaultOptions, standardizeSafelist, setOptions, mergeExtractorSelectors };
