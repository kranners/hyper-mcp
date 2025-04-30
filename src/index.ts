#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfigPath, loadConfig } from "./config";
import { createClientRecord } from "./clients";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { getAllCapabilitiesInMode } from "./capabilities";

const server = new Server(
  {
    name: "jailbreak-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
    // TODO: Write instructions
    instructions: undefined,
  },
);

const start = async () => {
  const transport = new StdioServerTransport();

  const configPath = getConfigPath({ env: process.env, argv: process.argv });
  const config = loadConfig(configPath);
  const clients = await createClientRecord(config);

  const defaultMode = config.modes.default;

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (): Promise<ListToolsResult> => {
      const capabilities = await getAllCapabilitiesInMode(clients, defaultMode);

      return {
        tools: capabilities.tools,
      };
    },
  );

  await server.connect(transport);
};

start().catch(console.error);
