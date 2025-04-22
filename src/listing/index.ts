import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const getAll = async <T>(
  clients: Client[],
  clientCallback: (client: Client) => T,
) => {
  const promises = clients.map(clientCallback);

  const listsOfResults = await Promise.all(promises);
  return listsOfResults.flat();
};

export const getAllTools = async (clients: Client[]) => {
  return getAll(clients, async (client) => {
    if (!client.getServerCapabilities()?.tools) {
      return [];
    }

    const result = await client.listTools();
    return result.tools;
  });
};

export const getAllResources = async (clients: Client[]) => {
  return getAll(clients, async (client) => {
    if (!client.getServerCapabilities()?.resources) {
      return [];
    }

    const result = await client.listResources();
    return result.resources;
  });
};

export const getAllPrompts = async (clients: Client[]) => {
  return getAll(clients, async (client) => {
    if (!client.getServerCapabilities()?.prompts) {
      return [];
    }

    const result = await client.listPrompts();
    return result.prompts;
  });
};

export const listingTool = async <T>(
  clients: Client[],
  listingCallback: (clients: Client[]) => Promise<T[]>,
): Promise<CallToolResult> => {
  const results = await listingCallback(clients);

  return {
    content: [{ type: "text", text: JSON.stringify(results) }],
  };
};
