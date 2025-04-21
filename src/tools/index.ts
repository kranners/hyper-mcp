import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  CallToolResult,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

const getAllTools = async (clients: Client[]) => {
  const listToolPromises = clients.map((client) =>
    client.listTools().then((result) => result.tools),
  );

  const tools = await Promise.all(listToolPromises);
  return tools.flat();
};

const findClientWithTool = async (
  clients: Client[],
  name: string,
): Promise<Client | undefined> => {
  for (const client of clients) {
    const { tools } = await client.listTools();
    const hasTool = tools.some((tool) => tool.name === name);
    if (hasTool) {
      return client;
    }
  }

  return undefined;
};

export const listTools = async (clients: Client[]): Promise<CallToolResult> => {
  const tools = await getAllTools(clients);
  const toolsAsText = JSON.stringify(tools);

  return {
    content: [{ type: "text", text: toolsAsText }],
  };
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
