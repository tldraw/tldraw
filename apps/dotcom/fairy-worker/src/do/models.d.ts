export declare const FAIRY_MODEL_NAME = "claude-4.5-sonnet";
export type AgentModelName = keyof typeof AGENT_MODEL_DEFINITIONS;
export type AgentModelProvider = 'openai' | 'anthropic' | 'google';
export interface AgentModelDefinition {
    name: AgentModelName;
    id: string;
    provider: AgentModelProvider;
    thinking?: boolean;
}
/**
 * Get the full information about a model from its name.
 * @param modelName - The name of the model.
 * @returns The full definition of the model.
 */
export declare function getAgentModelDefinition(modelName: AgentModelName): AgentModelDefinition;
export declare const AGENT_MODEL_DEFINITIONS: {
    readonly 'claude-4.5-sonnet': {
        readonly name: "claude-4.5-sonnet";
        readonly id: "claude-sonnet-4-5";
        readonly provider: "anthropic";
    };
    readonly 'claude-4-sonnet': {
        readonly name: "claude-4-sonnet";
        readonly id: "claude-sonnet-4-0";
        readonly provider: "anthropic";
    };
    readonly 'claude-3.5-sonnet': {
        readonly name: "claude-3.5-sonnet";
        readonly id: "claude-3-5-sonnet-latest";
        readonly provider: "anthropic";
    };
};
//# sourceMappingURL=models.d.ts.map