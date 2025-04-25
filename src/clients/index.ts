import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpConfig, type McpServerEntry } from "../config";

type Transport = StdioClientTransport | SSEClientTransport;

const createTransport = (entry: McpServerEntry): Transport => {
  const env = {
    ...(process.env as Record<string, string>),
    ...entry.env,
  };

  if ("url" in entry) {
    return new SSEClientTransport(new URL(entry.url));
  }

  return new StdioClientTransport({
    ...entry,
    env,
  });
};

export type ClientRecord = Record<string, Client>;

const createClient = async (
  name: string,
  entry: McpServerEntry,
): Promise<Client> => {
  const transport = createTransport(entry);

  const client = new Client({
    name: `jailbreak-mcp-${name}`,
    version: "0.0.0",
  });

  await client.connect(transport);
  return client;
};

export const createClientRecord = async (config: McpConfig): Promise<ClientRecord> => {
  const record: ClientRecord = {};

  for (const [name, entry] of Object.entries(config.mcpServers)) {
    try {
      const client = await createClient(name, entry);
      record[name] = client;
    } catch (err) {
      console.error(`Failed to create client for ${name}`, err);
    }
  }

  return record;
};
