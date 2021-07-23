import type { CodeKeywordDefinition, ErrorObject } from "../../types";
import { DependenciesErrorParams, PropertyDependencies } from "../applicator/dependencies";
export declare type DependentRequiredError = ErrorObject<"dependentRequired", DependenciesErrorParams, PropertyDependencies>;
declare const def: CodeKeywordDefinition;
export default def;
