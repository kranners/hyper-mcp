#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfigPath, loadConfig } from "./config";
import { createClients } from "./clients";
import { callTool, readResource } from "./calling";
import { z } from "zod";
import {
  CallToolResult,
  GetPromptRequestSchema,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import {
  getAllPrompts,
  getAllResources,
  getAllTools,
  listingTool,
} from "./listing";

const server = new McpServer({
  name: "jailbreak-mcp",
  version: "1.0.0",
});

const start = async () => {
  const transport = new StdioServerTransport();

  const configPath = getConfigPath({ env: process.env, argv: process.argv });
  const config = loadConfig(configPath);
  const clients = await createClients(config);

  server.tool("listTools", "List tools", () =>
    listingTool(clients, getAllTools),
  );

  server.tool("listResources", "List resources", () =>
    listingTool(clients, getAllResources),
  );

  server.tool("listPrompts", "List prompts", () =>
    listingTool(clients, getAllPrompts),
  );

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

  server.tool(
    "readResource",
    "Reads a resource",
    {
      name: z.string(),
      resourceArguments: z.record(z.string(), z.unknown()),
    },
    async ({ name, resourceArguments }): Promise<ReadResourceResult> => {
      return readResource({ clients, name, toolArguments: resourceArguments });
    },
  );

  await server.connect(transport);
};

start().catch(console.error);
