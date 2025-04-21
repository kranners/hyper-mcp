import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpConfig, type McpServerEntry } from "../config";

type Transport = StdioClientTransport | SSEClientTransport;

const createClientTransport = (entry: McpServerEntry): Transport => {
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

export type Connection = {
  name: string;
  client: Client;
  tools: Awaited<ReturnType<Client["listTools"]>>;
};

type ConnectionInput = {
  name: string;
  entry: McpServerEntry;
};

const createConnection = async ({
  name,
  entry,
}: ConnectionInput): Promise<Connection | undefined> => {
  try {
    const transport = createClientTransport(entry);

    const client = new Client({
      name: `jailbreak-mcp-${name}`,
      version: "0.0.0",
    });

    await client.connect(transport);

    const tools = await client.listTools();

    return {
      name,
      client,
      tools,
    };
  } catch (e) {
    console.error(`Failed to load ${name}`, e);
    return;
  }
};

export const createConnections = async (
  config: McpConfig,
): Promise<Connection[]> => {
  const mcpServerEntries = Object.entries(config.mcpServers);
  const connectionPromises = mcpServerEntries.map(([name, entry]) =>
    createConnection({ name, entry }),
  );

  const connections = await Promise.all(connectionPromises);
  return connections.filter((connection) => connection !== undefined);
};
