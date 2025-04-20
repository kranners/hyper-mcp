import { Connection } from "../connections";
import {
  CallToolResult,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

export const listTools = (connections: Connection[]): CallToolResult => {
  const toolsAsText = connections
    .map(({ tools }) => JSON.stringify(tools))
    .join("\n");

  return {
    content: [{ type: "text", text: toolsAsText }],
  };
};

export const updateTools = async (connections: Connection[]): Promise<void> => {
  connections.forEach(async (connection) => {
    connection.tools = await connection.client.listTools();
  });
};

type CallToolInput = {
  connections: Connection[];
  name: string;
  toolArguments: Record<string, unknown>;
};

export const callTool = async ({
  connections,
  name,
  toolArguments,
}: CallToolInput): Promise<CallToolResult> => {
  const connectionWithTool = connections.find((connection) => {
    return connection.tools.tools.some((tool) => {
      return tool.name === name;
    });
  });

  if (connectionWithTool === undefined) {
    return {
      content: [
        {
          type: "text",
          text: `ERROR: Tool with the name ${name} couldn't be found.`,
        },
      ],
    };
  }

  const result = await connectionWithTool.client.callTool({
    name,
    arguments: toolArguments,
  });

  return CallToolResultSchema.parse(result);
};
