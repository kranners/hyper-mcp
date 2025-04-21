#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfigPath, loadConfig } from "./config";
import { createClients } from "./clients";
import { callTool, listTools } from "./tools";
import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const server = new McpServer({
  name: "jailbreak-mcp",
  version: "1.0.0",
});

const start = async () => {
  const transport = new StdioServerTransport();

  const configPath = getConfigPath({ env: process.env, argv: process.argv });
  const config = loadConfig(configPath);
  const clients = await createClients(config);

  server.tool("listTools", "List available tools", () => listTools(clients));

  server.tool(
    "callTool",
    "Calls a tool",
    {
      name: z.string(),
      toolArguments: z.record(z.string(), z.unknown()),
    },
    async ({ name, toolArguments }): Promise<CallToolResult> => {
      return callTool({ clients, name, toolArguments });
    },
  );

  await server.connect(transport);
};

start().catch(console.error);
