#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfigPath, loadConfig } from "./config";
import { createClientRecord } from "./clients";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  CallToolResult,
  CallToolResultSchema,
  ListToolsRequestSchema,
  ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { getAllClientBundles } from "./capabilities";

const start = async () => {
  const transport = new StdioServerTransport();

  const configPath = getConfigPath({ env: process.env, argv: process.argv });
  const config = loadConfig(configPath);
  const clients = await createClientRecord(config);

  const instructions = Object.values(clients)
    .map((client) => client.getInstructions())
    .join("\n");

  const server = new Server(
    {
      name: "jailbreak-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
      instructions,
    },
  );

  const defaultMode = config.modes.default;

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (): Promise<ListToolsResult> => {
      const bundles = await getAllClientBundles(clients, defaultMode);
      const tools = bundles.map((bundle) => bundle.capabilities.tools).flat();
      return { tools };
    },
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request): Promise<CallToolResult> => {
      const bundles = await getAllClientBundles(clients, defaultMode);

      const bundleWithTool = bundles.find((bundle) => {
        return bundle.capabilities.tools.some(
          (tool) => tool.name === request.params.name,
        );
      });

      if (bundleWithTool === undefined) {
        return {
          content: [
            {
              type: "text",
              text: `ERROR: Tool with the name ${name} couldn't be found.`,
            },
          ],
        };
      }

      const result = await bundleWithTool.client.callTool(request.params);
      return CallToolResultSchema.parse(result);
    },
  );

  await server.connect(transport);
};

start().catch(console.error);
