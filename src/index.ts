#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfigPath, loadConfig } from "./config";
import { createClientRecord } from "./clients";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { getAllClientBundles } from "./capabilities";
import { updateRequestHandlers } from "./handlers";

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

  const defaultMode = config.modes?.[config.startingMode ?? "default"];
  const bundles = await getAllClientBundles({
    clients,
    mode: defaultMode,
  });

  updateRequestHandlers({
    server,
    bundles,
    clients,
    modes: config.modes,
  });

  await server.connect(transport);
};

start().catch(console.error);
