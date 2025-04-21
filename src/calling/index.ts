import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  CallToolResult,
  CallToolResultSchema,
  ReadResourceResult,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

const findClientWith = async (
  clients: Client[],
  predicate: (client: Client) => Promise<boolean>,
): Promise<Client | undefined> => {
  // .find() doesn't handle promises, can't use it
  for (const client of clients) {
    if (await predicate(client)) {
      return client;
    }
  }

  return undefined;
};

const findClientWithTool = async (clients: Client[], name: string) => {
  return findClientWith(clients, async (client) => {
    const { tools } = await client.listTools();
    return tools.some((tool) => tool.name === name);
  });
};

const findClientWithResource = async (clients: Client[], name: string) => {
  return findClientWith(clients, async (client) => {
    const { resources } = await client.listResources();
    return resources.some((resource) => resource.name === name);
  });
};

type CallToolInput = {
  clients: Client[];
  name: string;
  toolArguments: Record<string, unknown>;
};

export const callTool = async ({
  clients,
  name,
  toolArguments,
}: CallToolInput): Promise<CallToolResult> => {
  const client = await findClientWithTool(clients, name);

  if (client === undefined) {
    return {
      content: [
        {
          type: "text",
          text: `ERROR: Tool with the name ${name} couldn't be found.`,
        },
      ],
    };
  }

  const result = await client.callTool({ name, arguments: toolArguments });
  return CallToolResultSchema.parse(result);
};

export const readResource = async ({
  clients,
  name,
  toolArguments,
}: CallToolInput): Promise<ReadResourceResult> => {
  const client = await findClientWithResource(clients, name);

  if (client === undefined) {
    throw new Error(`No resource with name ${name}.`);
  }

  const result = await client.callTool({ name, arguments: toolArguments });
  return ReadResourceResultSchema.parse(result);
};
