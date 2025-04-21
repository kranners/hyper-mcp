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

const createClient = async (
  entry: McpServerEntry,
  name: string,
): Promise<Client | undefined> => {
  try {
    const transport = createTransport(entry);

    const client = new Client({
      name: `jailbreak-mcp-${name}`,
      version: "0.0.0",
    });

    await client.connect(transport);
    return client;
  } catch (e) {
    console.error("Failed to create client for server", entry, e);
    return;
  }
};

export const createClients = async (config: McpConfig): Promise<Client[]> => {
  const entries = Object.entries(config.mcpServers);
  const clients = await Promise.all(
    entries.map(([name, entry]) => createClient(entry, name)),
  );

  return clients.filter((client) => client !== undefined);
};
