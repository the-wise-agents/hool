export type ProjectType = 'web-app' | 'browser-game' | 'mobile-android' | 'animation' | 'cli-tool' | 'api-only' | 'desktop' | 'other';

export type AgentPlatform = 'claude-code' | 'cursor' | 'generic';

export interface McpDefinition {
  name: string;
  installCommand: string;
  configEntry: Record<string, unknown>;
}

export type ExecutionMode = 'interactive' | 'full-hool';

export interface AdapterConfig {
  platform: AgentPlatform;
  projectType: ProjectType;
  projectDir: string;
  promptsDir: string;
  mode: ExecutionMode;
}

export interface Adapter {
  readonly platform: AgentPlatform;

  /** Inject agent instructions into the platform's config (CLAUDE.md, .cursor/rules/, etc.) */
  injectInstructions(config: AdapterConfig): Promise<void>;

  /** Install an MCP into the platform's global config */
  installMcp(mcp: McpDefinition): Promise<void>;

  /** Check if an MCP is already installed */
  isMcpInstalled(mcpName: string): Promise<boolean>;

  /** Get platform-specific completion message */
  getCompletionMessage(config: AdapterConfig): string;
}
