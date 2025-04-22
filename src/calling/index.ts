import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  CallToolResult,
  CallToolResultSchema,
  GetPromptResultSchema,
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
    if (!client.getServerCapabilities()?.tools) {
      return false;
    }

    const { tools } = await client.listTools();
    return tools.some((tool) => tool.name === name);
  });
};

const findClientWithResource = async (clients: Client[], uri: string) => {
  return findClientWith(clients, async (client) => {
    if (!client.getServerCapabilities()?.resources) {
      return false;
    }

    const { resources } = await client.listResources();
    return resources.some((resource) => resource.uri === uri);
  });
};

const findClientWithPrompt = async (clients: Client[], name: string) => {
  return findClientWith(clients, async (client) => {
    if (!client.getServerCapabilities()?.prompts) {
      return false;
    }

    const { prompts } = await client.listPrompts();
    return prompts.some((prompt) => prompt.name === name);
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

type ReadResourceInput = {
  clients: Client[];
  uri: string;
  resourceArguments: Record<string, unknown> | undefined;
};

export const readResource = async ({
  clients,
  uri,
  resourceArguments,
}: ReadResourceInput): Promise<CallToolResult> => {
  const client = await findClientWithResource(clients, uri);

  if (client === undefined) {
    throw new Error(`No resource with name ${name}.`);
  }

  const result = await client.readResource({
    uri,
    arguments: resourceArguments,
  });
  const resourceResult = ReadResourceResultSchema.parse(result);

  // Convert from ReadResourceResult to CallToolResult format
  return {
    content: resourceResult.contents.map((item) => ({
      type: "resource",
      resource: item,
    })),
    _meta: resourceResult._meta,
  };
};

type GetPromptInput = {
  clients: Client[];
  name: string;
  promptArguments: Record<string, string> | undefined;
};

export const getPrompt = async ({
  clients,
  name,
  promptArguments,
}: GetPromptInput) => {
  const client = await findClientWithPrompt(clients, name);

  if (client === undefined) {
    throw new Error(`No resource with name ${name}.`);
  }

  const result = await client.getPrompt({
    name,
    arguments: promptArguments,
  });

  const promptResults = GetPromptResultSchema.parse(result);
  return {
    content: promptResults.messages.map((message) => message.content),
    _meta: promptResults._meta,
  };
};
