import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Prompt, Resource, Tool } from "@modelcontextprotocol/sdk/types";
import { ClientRecord } from "../clients";
import { McpMode } from "../config";

export type CapabilityType = "tools" | "prompts" | "resources";

export type Capability = Tool | Prompt | Resource;

export type CapabilitySet = {
  tools: Tool[];
  prompts: Prompt[];
  resources: Resource[];
};

export const listClientTools = async (client: Client): Promise<Tool[]> => {
  if (!client.getServerCapabilities()?.tools) {
    return [];
  }
  return (await client.listTools()).tools;
};

export const listClientResources = async (
  client: Client,
): Promise<Resource[]> => {
  if (!client.getServerCapabilities()?.resources) {
    return [];
  }
  return (await client.listResources()).resources;
};

export const listClientPrompts = async (client: Client): Promise<Prompt[]> => {
  if (!client.getServerCapabilities()?.prompts) {
    return [];
  }
  return (await client.listPrompts()).prompts;
};

type IsCapabilityIncludedInput = {
  capability: Capability;
  serverName: string;
  capabilityType: CapabilityType;
  mode: McpMode;
};

export const isCapabilityIncludedInMode = ({
  capability,
  serverName,
  capabilityType,
  mode,
}: IsCapabilityIncludedInput): boolean => {
  const serverConfig = mode[serverName];

  if (serverConfig === true) {
    return true;
  }

  if (serverConfig === undefined) {
    return false;
  }

  const enabledCapabilities = serverConfig[capabilityType];

  if (enabledCapabilities === undefined) {
    return false;
  }

  return enabledCapabilities.includes(capability.name ?? capability.uri);
};

type ListClientCapabilitiesInput = {
  client: Client;
  serverName: string;
  mode: McpMode;
};

export const listClientCapabilities = async ({
  client,
  serverName,
  mode,
}: ListClientCapabilitiesInput): Promise<CapabilitySet> => {
  const tools = await listClientTools(client).then((tools) =>
    tools.filter((tool) =>
      isCapabilityIncludedInMode({
        capability: tool,
        capabilityType: "tools",
        serverName,
        mode,
      }),
    ),
  );

  const prompts = await listClientPrompts(client).then((prompts) =>
    prompts.filter((prompt) =>
      isCapabilityIncludedInMode({
        capability: prompt,
        capabilityType: "prompts",
        serverName,
        mode,
      }),
    ),
  );

  const resources = await listClientResources(client).then((resources) =>
    resources.filter((resource) =>
      isCapabilityIncludedInMode({
        capability: resource,
        capabilityType: "resources",
        serverName,
        mode,
      }),
    ),
  );

  return { tools, prompts, resources };
};

export type ClientBundle = {
  serverName: string;
  client: Client;
  capabilities: CapabilitySet;
};

type GetAllClientBundlesInput = {
  clients: ClientRecord;
  mode: McpMode;
};

export const getAllClientBundles = async ({
  clients,
  mode,
}: GetAllClientBundlesInput): Promise<ClientBundle[]> => {
  const entries = Object.entries(clients).map(async ([serverName, client]) => {
    try {
      return {
        serverName,
        client,
        capabilities: await listClientCapabilities({
          client,
          serverName,
          mode,
        }),
      };
    } catch (error) {
      console.error(`Failed to get capabilities for ${serverName}`, error);

      return {
        serverName,
        client,
        capabilities: {
          tools: [],
          prompts: [],
          resources: [],
        },
      };
    }
  });

  return Promise.all(entries);
};
