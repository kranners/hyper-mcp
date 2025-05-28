import { readFileSync } from "fs";
import { z } from "zod";
import { join } from "path";
import { homedir } from "os";

const expandVariables = (input: unknown) => {
  return String(input).replace(/\$([A-Z_]+)/g, (_, variableName) => {
    if (process.env[variableName] === undefined) {
      return variableName;
    }

    return process.env[variableName];
  });
};

const environmentExpandedString = z.preprocess(expandVariables, z.string());

const McpStdioEntry = z.object({
  command: environmentExpandedString,
  args: environmentExpandedString.array().optional(),
  env: z.record(z.string(), environmentExpandedString).optional(),
});

const McpSseEntry = z.object({
  url: z.string(),
  env: z.record(z.string(), environmentExpandedString).optional(),
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

export type McpServerTarget = z.infer<typeof McpServerTarget>;

const McpMode = z.record(z.string(), McpServerTarget);

export type McpMode = z.infer<typeof McpMode>;

const McpModeConfig = z
  .object({
    default: McpMode,
  })
  .and(z.record(z.string(), McpMode));

export type McpModeConfig = z.infer<typeof McpModeConfig>;

const McpServerConfig = z.record(z.string(), McpServerEntry);

const McpConfig = z.object({
  mcpServers: McpServerConfig,
  modes: McpModeConfig,
  startingMode: z.string().optional(),
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
