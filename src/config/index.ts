import { readFileSync } from "fs";
import { z } from "zod";
import { join } from "path";
import { homedir } from "os";

const McpStdioEntry = z.object({
  command: z.string(),
  args: z.string().array().optional(),
  env: z.record(z.string(), z.string()).optional(),
});

const McpSseEntry = z.object({
  url: z.string(),
  env: z.record(z.string(), z.string()).optional(),
});

const McpServerEntry = z.union([McpStdioEntry, McpSseEntry]);

export type McpServerEntry = z.infer<typeof McpServerEntry>;

const McpServerTarget = z.union([
  z.literal(true),
  z.object({
    tools: z.string().array().optional(),
    prompts: z.string().array().optional(),
    resources: z.string().array().optional(),
  }),
]);

const McpMode = z.record(z.string(), McpServerTarget);

export type McpMode = z.infer<typeof McpMode>;

const McpModes = z
  .object({
    default: McpMode,
  })
  .and(z.record(z.string(), McpMode));

const McpConfig = z.object({
  mcpServers: z.record(z.string(), McpServerEntry),
  modes: McpModes,
});

export type McpConfig = z.infer<typeof McpConfig>;

export const loadConfig = (configPath: string): McpConfig => {
  const configContents = JSON.parse(readFileSync(configPath).toString());
  return McpConfig.parse(configContents);
};

export const DEFAULT_CONFIG_PATH = join(
  homedir(),
  ".cursor",
  "jailbreak.mcp.json",
);

export type GetConfigPathInput = {
  env: NodeJS.ProcessEnv;
  argv: string[];
};

export const getConfigPath = ({ env, argv }: GetConfigPathInput): string => {
  const { CONFIG_PATH } = env;
  const [configPathArgument] = argv.slice(2);

  return configPathArgument ?? CONFIG_PATH ?? DEFAULT_CONFIG_PATH;
};
