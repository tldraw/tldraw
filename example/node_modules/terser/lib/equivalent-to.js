import {
    AST_Array,
    AST_Atom,
    AST_Await,
    AST_BigInt,
    AST_Binary,
    AST_Block,
    AST_Call,
    AST_Catch,
    AST_Chain,
    AST_Class,
    AST_ClassProperty,
    AST_ConciseMethod,
    AST_Conditional,
    AST_Debugger,
    AST_Definitions,
    AST_Destructuring,
    AST_Directive,
    AST_Do,
    AST_Dot,
    AST_DotHash,
    AST_EmptyStatement,
    AST_Expansion,
    AST_Export,
    AST_Finally,
    AST_For,
    AST_ForIn,
    AST_ForOf,
    AST_If,
    AST_Import,
    AST_ImportMeta,
    AST_Jump,
    AST_LabeledStatement,
    AST_Lambda,
    AST_LoopControl,
    AST_NameMapping,
    AST_NewTarget,
    AST_Node,
    AST_Number,
    AST_Object,
    AST_ObjectGetter,
    AST_ObjectKeyVal,
    AST_ObjectProperty,
    AST_ObjectSetter,
    AST_PrefixedTemplateString,
    AST_PropAccess,
    AST_RegExp,
    AST_Sequence,
    AST_SimpleStatement,
    AST_String,
    AST_Super,
    AST_Switch,
    AST_SwitchBranch,
    AST_Symbol,
    AST_TemplateSegment,
    AST_TemplateString,
    AST_This,
    AST_Toplevel,
    AST_Try,
    AST_Unary,
    AST_VarDef,
    AST_While,
    AST_With,
    AST_Yield
} from "./ast.js";

const shallow_cmp = (node1, node2) => {
    return (
        node1 === null && node2 === null
        || node1.TYPE === node2.TYPE && node1.shallow_cmp(node2)
    );
};

export const equivalent_to = (tree1, tree2) => {
    if (!shallow_cmp(tree1, tree2)) return false;
    const walk_1_state = [tree1];
    const walk_2_state = [tree2];

    const walk_1_push = walk_1_state.push.bind(walk_1_state);
    const walk_2_push = walk_2_state.push.bind(walk_2_state);

    while (walk_1_state.length && walk_2_state.length) {
        const node_1 = walk_1_state.pop();
        const node_2 = walk_2_state.pop();

        if (!shallow_cmp(node_1, node_2)) return false;

        node_1._children_backwards(walk_1_push);
        node_2._children_backwards(walk_2_push);

        if (walk_1_state.length !== walk_2_state.length) {
            // Different number of children
            return false;
        }
    }

    return walk_1_state.length == 0 && walk_2_state.length == 0;
};

// Creates a shallow compare function
const mkshallow = (props) => {
    const comparisons = Object
        .keys(props)
        .map(key => {
            if (props[key] === "eq") {
                return `this.${key} === other.${key}`;
            } else if (props[key] === "exist") {
                return `(this.${key} == null ? other.${key} == null : this.${key} === other.${key})`;
            } else {
                throw new Error(`mkshallow: Unexpected instruction: ${props[key]}`);
            }
        })
        .join(" && ");

    return new Function("other", "return " + comparisons);
};

const pass_through = () => true;

AST_Node.prototype.shallow_cmp = function () {
    throw new Error("did not find a shallow_cmp function for " + this.constructor.name);
};

AST_Debugger.prototype.shallow_cmp = pass_through;

AST_Directive.prototype.shallow_cmp = mkshallow({ value: "eq" });

AST_SimpleStatement.prototype.shallow_cmp = pass_through;

AST_Block.prototype.shallow_cmp = pass_through;

AST_EmptyStatement.prototype.shallow_cmp = pass_through;

AST_LabeledStatement.prototype.shallow_cmp = mkshallow({ "label.name": "eq" });

AST_Do.prototype.shallow_cmp = pass_through;

AST_While.prototype.shallow_cmp = pass_through;

AST_For.prototype.shallow_cmp = mkshallow({
    init: "exist",
    condition: "exist",
    step: "exist"
});

AST_ForIn.prototype.shallow_cmp = pass_through;

AST_ForOf.prototype.shallow_cmp = pass_through;

AST_With.prototype.shallow_cmp = pass_through;

AST_Toplevel.prototype.shallow_cmp = pass_through;

AST_Expansion.prototype.shallow_cmp = pass_through;

AST_Lambda.prototype.shallow_cmp = mkshallow({
    is_generator: "eq",
    async: "eq"
});

AST_Destructuring.prototype.shallow_cmp = mkshallow({
    is_array: "eq"
});

AST_PrefixedTemplateString.prototype.shallow_cmp = pass_through;

AST_TemplateString.prototype.shallow_cmp = pass_through;

AST_TemplateSegment.prototype.shallow_cmp = mkshallow({
    "value": "eq"
});

AST_Jump.prototype.shallow_cmp = pass_through;

AST_LoopControl.prototype.shallow_cmp = pass_through;

AST_Await.prototype.shallow_cmp = pass_through;

AST_Yield.prototype.shallow_cmp = mkshallow({
    is_star: "eq"
});

AST_If.prototype.shallow_cmp = mkshallow({
    alternative: "exist"
});

AST_Switch.prototype.shallow_cmp = pass_through;

AST_SwitchBranch.prototype.shallow_cmp = pass_through;

AST_Try.prototype.shallow_cmp = mkshallow({
    bcatch: "exist",
    bfinally: "exist"
});

AST_Catch.prototype.shallow_cmp = mkshallow({
    argname: "exist"
});

AST_Finally.prototype.shallow_cmp = pass_through;

AST_Definitions.prototype.shallow_cmp = pass_through;

AST_VarDef.prototype.shallow_cmp = mkshallow({
    value: "exist"
});

AST_NameMapping.prototype.shallow_cmp = pass_through;

AST_Import.prototype.shallow_cmp = mkshallow({
    imported_name: "exist",
    imported_names: "exist"
});

AST_ImportMeta.prototype.shallow_cmp = pass_through;

AST_Export.prototype.shallow_cmp = mkshallow({
    exported_definition: "exist",
    exported_value: "exist",
    exported_names: "exist",
    module_name: "eq",
    is_default: "eq",
});

AST_Call.prototype.shallow_cmp = pass_through;

AST_Sequence.prototype.shallow_cmp = pass_through;

AST_PropAccess.prototype.shallow_cmp = pass_through;

AST_Chain.prototype.shallow_cmp = pass_through;

AST_Dot.prototype.shallow_cmp = mkshallow({
    property: "eq"
});

AST_DotHash.prototype.shallow_cmp = mkshallow({
    property: "eq"
});

AST_Unary.prototype.shallow_cmp = mkshallow({
    operator: "eq"
});

AST_Binary.prototype.shallow_cmp = mkshallow({
    operator: "eq"
});

AST_Conditional.prototype.shallow_cmp = pass_through;

AST_Array.prototype.shallow_cmp = pass_through;

AST_Object.prototype.shallow_cmp = pass_through;

AST_ObjectProperty.prototype.shallow_cmp = pass_through;

AST_ObjectKeyVal.prototype.shallow_cmp = mkshallow({
    key: "eq"
});

AST_ObjectSetter.prototype.shallow_cmp = mkshallow({
    static: "eq"
});

AST_ObjectGetter.prototype.shallow_cmp = mkshallow({
    static: "eq"
});

AST_ConciseMethod.prototype.shallow_cmp = mkshallow({
    static: "eq",
    is_generator: "eq",
    async: "eq",
});

AST_Class.prototype.shallow_cmp = mkshallow({
    name: "exist",
    extends: "exist",
});

AST_ClassProperty.prototype.shallow_cmp = mkshallow({
    static: "eq"
});

AST_Symbol.prototype.shallow_cmp = mkshallow({
    name: "eq"
});

AST_NewTarget.prototype.shallow_cmp = pass_through;

AST_This.prototype.shallow_cmp = pass_through;

AST_Super.prototype.shallow_cmp = pass_through;

AST_String.prototype.shallow_cmp = mkshallow({
    value: "eq"
});

AST_Number.prototype.shallow_cmp = mkshallow({
    value: "eq"
});

AST_BigInt.prototype.shallow_cmp = mkshallow({
    value: "eq"
});

AST_RegExp.prototype.shallow_cmp = function (other) {
    return (
        this.value.flags === other.value.flags
        && this.value.source === other.value.source
    );
};

AST_Atom.prototype.shallow_cmp = pass_through;
