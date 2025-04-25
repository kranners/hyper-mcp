import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  CallToolResult,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

type ClientRecord = Record<string, Client>;

const getAllTools = async (clients: ClientRecord) => {
  const listToolPromises = Object.values(clients).map((client) =>
    client.listTools().then((result) => result.tools),
  );

  const tools = await Promise.all(listToolPromises);
  return tools.flat();
};

const findClientWithTool = async (
  clients: ClientRecord,
  name: string,
): Promise<Client | undefined> => {
  for (const client of Object.values(clients)) {
    const { tools } = await client.listTools();
    const hasTool = tools.some((tool) => tool.name === name);
    if (hasTool) {
      return client;
    }
  }

  return undefined;
};

export const listTools = async (clients: ClientRecord): Promise<CallToolResult> => {
  const tools = await getAllTools(clients);
  const toolsAsText = JSON.stringify(tools);

  return {
    content: [{ type: "text", text: toolsAsText }],
  };
};

type CallToolInput = {
  clients: ClientRecord;
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
