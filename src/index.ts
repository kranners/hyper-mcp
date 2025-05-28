#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfigPath, loadConfig } from "./config";
import { createClientRecord } from "./clients";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { getAllClientBundles } from "./capabilities";
import { updateRequestHandlers } from "./handlers";

const start = async () => {
  const transport = new StdioServerTransport();

  console.log("getting config");
  const configPath = getConfigPath({ env: process.env, argv: process.argv });
  const config = loadConfig(configPath);

  console.log("creating clients");
  const clients = await createClientRecord(config);

  console.log("building instructions");
  const instructions = Object.values(clients)
    .map((client) => client.getInstructions())
    .join("\n");

  console.log("setting up server");
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

  console.log("making client bundles");
  const bundles = await getAllClientBundles({
    clients,
    mode: defaultMode,
  });

  console.log("updating request handlers");
  updateRequestHandlers({
    server,
    bundles,
    clients,
    modes: config.modes,
  });

  await server.connect(transport);
};

start().catch(console.error);
