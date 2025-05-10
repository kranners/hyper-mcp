import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type {
  Prompt,
  Resource,
  Tool,
  ServerCapabilities,
} from "@modelcontextprotocol/sdk/types.js";
import { McpMode } from "../config";
import {
  listClientTools,
  listClientPrompts,
  listClientResources,
  isCapabilityIncludedInMode,
  listClientCapabilities,
  getAllClientBundles,
} from "./index";

jest.mock("@modelcontextprotocol/sdk/client/index.js");

const MOCK_TOOLS: Tool[] = [
  {
    name: "includedTool",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "excludedTool",
    inputSchema: { type: "object" as const, properties: {} },
  },
];

const MOCK_PROMPTS: Prompt[] = [
  { name: "includedPrompt" },
  { name: "excludedPrompt" },
];

const MOCK_RESOURCES: Resource[] = [
  { name: "includedResource", uri: "includedResource" },
  { name: "excludedResource", uri: "excludedResource" },
];

const DEFAULT_SERVER_CAPABILITIES: ServerCapabilities = {
  tools: { listChanged: false },
  prompts: { listChanged: false },
  resources: { listChanged: false, subscribe: false },
};

const SERVER_CAPABILITIES_NULL_SCENARIO = {
  scenario: "getServerCapabilities returns null",
  capabilities: null,
};

const SERVER_CAPABILITIES_UNDEFINED_SCENARIO = {
  scenario: "getServerCapabilities returns undefined",
  capabilities: undefined,
};

const NO_TOOLS_CAPABILITY_SCENARIO = {
  scenario: "tools capability is not available",
  capabilities: {
    prompts: { listChanged: false },
    resources: { listChanged: false, subscribe: false },
  } as ServerCapabilities,
};

const NO_PROMPTS_CAPABILITY_SCENARIO = {
  scenario: "prompts capability is not available",
  capabilities: {
    tools: { listChanged: false },
    resources: { listChanged: false, subscribe: false },
  } as ServerCapabilities,
};

const NO_RESOURCES_CAPABILITY_SCENARIO = {
  scenario: "resources capability is not available",
  capabilities: {
    tools: { listChanged: false },
    prompts: { listChanged: false },
  } as ServerCapabilities,
};

const SERVER_FULL_ACCESS_MODE: McpMode = { testServer: true };
const EMPTY_MODE: McpMode = {};
const TOOLS_ONLY_MODE: McpMode = {
  testServer: { tools: ["testCapability"] },
};
const PROMPTS_ONLY_MODE: McpMode = {
  testServer: { prompts: ["includedPrompt"] },
};
const FILTERED_MODE: McpMode = {
  testServer: {
    tools: ["includedTool"],
    prompts: ["includedPrompt"],
    resources: ["includedResource"],
  },
};

const CAPABILITY_MODE_TEST_SCENARIOS = [
  {
    scenario: "server config is true",
    mode: SERVER_FULL_ACCESS_MODE,
    expected: true,
  },
  {
    scenario: "server config is undefined",
    mode: EMPTY_MODE,
    expected: false,
  },
  {
    scenario: "capability type is not enabled",
    mode: PROMPTS_ONLY_MODE,
    expected: false,
  },
  {
    scenario: "capability name is included",
    mode: TOOLS_ONLY_MODE,
    expected: true,
  },
  {
    scenario: "capability name is not included",
    mode: { testServer: { tools: ["otherCapability"] } } as McpMode,
    expected: false,
  },
];

const TEST_CAPABILITY = {
  name: "testCapability",
  inputSchema: { type: "object" as const, properties: {} },
};
const TEST_SERVER_NAME = "testServer";

const RESOURCE_WITHOUT_NAME = { uri: "testUri" } as Resource;

const EMPTY_TOOLS_RESPONSE = { tools: [], listChanged: false };
const EMPTY_PROMPTS_RESPONSE = { prompts: [], listChanged: false };
const EMPTY_RESOURCES_RESPONSE = { resources: [], listChanged: false };

const MOCK_TOOLS_RESPONSE = { tools: MOCK_TOOLS, listChanged: false };
const MOCK_PROMPTS_RESPONSE = { prompts: MOCK_PROMPTS, listChanged: false };
const MOCK_RESOURCES_RESPONSE = {
  resources: MOCK_RESOURCES,
  listChanged: false,
};

type MockClientParams = {
  name: string;
  tools?: Tool[];
  prompts?: Prompt[];
  resources?: Resource[];
};

function createMockClient({
  name,
  tools = [],
  prompts = [],
  resources = [],
}: MockClientParams): jest.Mocked<Client> {
  const client = new Client({
    name,
    version: "1.0.0",
  }) as jest.Mocked<Client>;

  client.getServerCapabilities = jest
    .fn()
    .mockReturnValue(DEFAULT_SERVER_CAPABILITIES);

  client.listTools = jest.fn().mockResolvedValue({
    tools,
    listChanged: false,
  });

  client.listPrompts = jest.fn().mockResolvedValue({
    prompts,
    listChanged: false,
  });

  client.listResources = jest.fn().mockResolvedValue({
    resources,
    listChanged: false,
  });

  return client;
}

describe("capabilities module", () => {
  let mockClient: jest.Mocked<Client>;

  beforeEach(() => {
    mockClient = new Client({
      name: "test-client",
      version: "1.0.0",
    }) as jest.Mocked<Client>;

    mockClient.getServerCapabilities = jest
      .fn()
      .mockReturnValue(DEFAULT_SERVER_CAPABILITIES);
    mockClient.listTools = jest.fn().mockResolvedValue(EMPTY_TOOLS_RESPONSE);
    mockClient.listPrompts = jest
      .fn()
      .mockResolvedValue(EMPTY_PROMPTS_RESPONSE);
    mockClient.listResources = jest
      .fn()
      .mockResolvedValue(EMPTY_RESOURCES_RESPONSE);
  });

  describe("listClientTools", () => {
    it("returns tools when capability is available", async () => {
      mockClient.listTools.mockResolvedValue(MOCK_TOOLS_RESPONSE);

      const result = await listClientTools(mockClient);

      expect(result).toEqual(MOCK_TOOLS);
      expect(mockClient.listTools).toHaveBeenCalledTimes(1);
    });

    it.each([
      NO_TOOLS_CAPABILITY_SCENARIO,
      SERVER_CAPABILITIES_NULL_SCENARIO,
      SERVER_CAPABILITIES_UNDEFINED_SCENARIO,
    ])("returns empty array when $scenario", async ({ capabilities }) => {
      mockClient.getServerCapabilities = jest
        .fn()
        .mockReturnValue(capabilities);

      const result = await listClientTools(mockClient);

      expect(result).toEqual([]);
      expect(mockClient.listTools).not.toHaveBeenCalled();
    });
  });

  describe("listClientPrompts", () => {
    it("returns prompts when capability is available", async () => {
      mockClient.listPrompts.mockResolvedValue(MOCK_PROMPTS_RESPONSE);

      const result = await listClientPrompts(mockClient);

      expect(result).toEqual(MOCK_PROMPTS);
      expect(mockClient.listPrompts).toHaveBeenCalledTimes(1);
    });

    it.each([
      NO_PROMPTS_CAPABILITY_SCENARIO,
      SERVER_CAPABILITIES_NULL_SCENARIO,
      SERVER_CAPABILITIES_UNDEFINED_SCENARIO,
    ])("returns empty array when $scenario", async ({ capabilities }) => {
      mockClient.getServerCapabilities = jest
        .fn()
        .mockReturnValue(capabilities);

      const result = await listClientPrompts(mockClient);

      expect(result).toEqual([]);
      expect(mockClient.listPrompts).not.toHaveBeenCalled();
    });
  });

  describe("listClientResources", () => {
    it("returns resources when capability is available", async () => {
      mockClient.listResources.mockResolvedValue(MOCK_RESOURCES_RESPONSE);

      const result = await listClientResources(mockClient);

      expect(result).toEqual(MOCK_RESOURCES);
      expect(mockClient.listResources).toHaveBeenCalledTimes(1);
    });

    it.each([
      NO_RESOURCES_CAPABILITY_SCENARIO,
      SERVER_CAPABILITIES_NULL_SCENARIO,
      SERVER_CAPABILITIES_UNDEFINED_SCENARIO,
    ])("returns empty array when $scenario", async ({ capabilities }) => {
      mockClient.getServerCapabilities = jest
        .fn()
        .mockReturnValue(capabilities);

      const result = await listClientResources(mockClient);

      expect(result).toEqual([]);
      expect(mockClient.listResources).not.toHaveBeenCalled();
    });
  });

  describe("isCapabilityIncludedInMode", () => {
    it.each(CAPABILITY_MODE_TEST_SCENARIOS)(
      "returns $expected when $scenario",
      async ({ mode, expected }) => {
        const result = isCapabilityIncludedInMode({
          capability: TEST_CAPABILITY,
          serverName: TEST_SERVER_NAME,
          capabilityType: "tools",
          mode,
        });

        expect(result).toBe(expected);
      },
    );

    it("uses uri when name is not available", () => {
      const mode: McpMode = {
        testServer: {
          resources: ["testUri"],
        },
      };

      const result = isCapabilityIncludedInMode({
        capability: RESOURCE_WITHOUT_NAME,
        serverName: TEST_SERVER_NAME,
        capabilityType: "resources",
        mode,
      });

      expect(result).toBe(true);
    });
  });

  describe("listClientCapabilities", () => {
    it("filters capabilities based on mode configuration", async () => {
      mockClient.listTools.mockResolvedValue(MOCK_TOOLS_RESPONSE);
      mockClient.listPrompts.mockResolvedValue(MOCK_PROMPTS_RESPONSE);
      mockClient.listResources.mockResolvedValue(MOCK_RESOURCES_RESPONSE);

      const result = await listClientCapabilities({
        client: mockClient,
        serverName: TEST_SERVER_NAME,
        mode: FILTERED_MODE,
      });

      const [includedTool] = MOCK_TOOLS;
      const [includedPrompt] = MOCK_PROMPTS;
      const [includedResource] = MOCK_RESOURCES;

      expect(result).toEqual({
        tools: [includedTool],
        prompts: [includedPrompt],
        resources: [includedResource],
      });

      expect(mockClient.listTools).toHaveBeenCalledTimes(1);
      expect(mockClient.listPrompts).toHaveBeenCalledTimes(1);
      expect(mockClient.listResources).toHaveBeenCalledTimes(1);
    });

    it("includes all capabilities when server config is true", async () => {
      mockClient.listTools.mockResolvedValue(MOCK_TOOLS_RESPONSE);
      mockClient.listPrompts.mockResolvedValue(MOCK_PROMPTS_RESPONSE);
      mockClient.listResources.mockResolvedValue(MOCK_RESOURCES_RESPONSE);

      const result = await listClientCapabilities({
        client: mockClient,
        serverName: TEST_SERVER_NAME,
        mode: SERVER_FULL_ACCESS_MODE,
      });

      expect(result).toEqual({
        tools: MOCK_TOOLS,
        prompts: MOCK_PROMPTS,
        resources: MOCK_RESOURCES,
      });
    });
  });

  describe("getAllClientBundles", () => {
    it("gets capabilities for all clients", async () => {
      const mockTool1 = {
        name: "tool1",
        inputSchema: { type: "object" as const, properties: {} },
      };
      const mockPrompt1 = { name: "prompt1" };
      const mockResource1 = { name: "resource1", uri: "resource1" };

      const mockTool2 = {
        name: "tool2",
        inputSchema: { type: "object" as const, properties: {} },
      };
      const mockPrompt2 = { name: "prompt2" };
      const mockResource2 = { name: "resource2", uri: "resource2" };

      const mockClient1 = createMockClient({
        name: "client1",
        tools: [mockTool1],
        prompts: [mockPrompt1],
        resources: [mockResource1],
      });

      const mockClient2 = createMockClient({
        name: "client2",
        tools: [mockTool2],
        prompts: [mockPrompt2],
        resources: [mockResource2],
      });

      const clients = {
        server1: mockClient1,
        server2: mockClient2,
      };

      const mode: McpMode = {
        server1: true,
        server2: true,
      };

      const result = await getAllClientBundles({ clients, mode });

      const [bundle1, bundle2] = result;

      expect(result).toHaveLength(2);

      expect(bundle1.serverName).toBe("server1");
      expect(bundle1.client).toBe(mockClient1);
      expect(bundle1.capabilities).toEqual({
        tools: [mockTool1],
        prompts: [mockPrompt1],
        resources: [mockResource1],
      });

      expect(bundle2.serverName).toBe("server2");
      expect(bundle2.client).toBe(mockClient2);
      expect(bundle2.capabilities).toEqual({
        tools: [mockTool2],
        prompts: [mockPrompt2],
        resources: [mockResource2],
      });
    });

    it("handles errors when getting client capabilities", async () => {
      const mockClient = new Client({
        name: "errorClient",
        version: "1.0.0",
      }) as jest.Mocked<Client>;

      mockClient.getServerCapabilities = jest.fn().mockReturnValue({
        tools: { listChanged: false },
      } as ServerCapabilities);

      mockClient.listTools = jest
        .fn()
        .mockRejectedValue(new Error("Connection failed"));

      const clients = {
        errorServer: mockClient,
      };

      const mode: McpMode = {
        errorServer: true,
      };

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await getAllClientBundles({ clients, mode });

      const [errorBundle] = result;

      expect(result).toHaveLength(1);
      expect(errorBundle.serverName).toBe("errorServer");
      expect(errorBundle.client).toBe(mockClient);
      expect(errorBundle.capabilities).toEqual({
        tools: [],
        prompts: [],
        resources: [],
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to get capabilities for errorServer",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
