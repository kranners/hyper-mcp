import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  getAndCallToolFromBundle,
  handleListModesRequest,
  handleChangeModeRequest,
  updateRequestHandlers,
} from "./index";
import { McpModeConfig } from "../config";
import { ClientRecord } from "../clients";
import { ClientBundle } from "../capabilities";
import * as capabilities from "../capabilities";
import {
  CallToolRequest,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
  ListToolsResult,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import path from "path";

process.env.CONFIG_PATH = path.join(
  __dirname,
  "..",
  "..",
  "test.jailbreak.mcp.json",
);

jest.mock("@modelcontextprotocol/sdk/server/index.js");
jest.mock("@modelcontextprotocol/sdk/client/index.js");
jest.mock("../formatting", () => ({
  getModeListingOutputFor: jest.fn().mockImplementation(({ modeName }) => {
    return `Mock output for ${modeName} mode`;
  }),
}));
jest.mock("../capabilities", () => ({
  getAllClientBundles: jest.fn().mockResolvedValue([]),
}));

// Constants
const TEST_SERVER_NAME = "test-server";
const TEST_TOOL_NAME = "test-tool";
const ALTERNATE_MODE_NAME = "alternate-mode";
const MOCK_TOOL_RESPONSE = "Mock tool response";

const DEFAULT_MODES: McpModeConfig = {
  default: {
    [TEST_SERVER_NAME]: true,
  },
  [ALTERNATE_MODE_NAME]: {
    [TEST_SERVER_NAME]: {
      tools: ["alternate-tool"],
    },
  },
};

const createMockTool = (name: string, description: string): Tool => ({
  name,
  description,
  inputSchema: {
    type: "object",
  },
});

type TestContext = {
  server: jest.Mocked<Server>;
  client: jest.Mocked<Client>;
  bundles: ClientBundle[];
  modes: McpModeConfig;
  clients: ClientRecord;
  requestHandlerCallbacks: {
    listTools: () => Promise<ListToolsResult>;
    callTool: (request: CallToolRequest) => Promise<CallToolResult>;
  };
};

function createTestContext(
  options: {
    modes?: McpModeConfig;
  } = {},
): TestContext {
  // Setup mock server
  const server = new Server({
    name: TEST_SERVER_NAME,
    version: "1.0.0",
  }) as jest.Mocked<Server>;

  const requestHandlerCallbacks: {
    listTools: () => Promise<ListToolsResult>;
    callTool: (request: CallToolRequest) => Promise<CallToolResult>;
  } = {
    listTools: async () => ({ tools: [] }),
    callTool: async () => ({ content: [] }),
  };

  server.setRequestHandler = jest
    .fn()
    .mockImplementation((schema, callback) => {
      // Store callbacks to test them directly
      if (schema === ListToolsRequestSchema) {
        requestHandlerCallbacks.listTools =
          callback as () => Promise<ListToolsResult>;
      } else if (schema === CallToolRequestSchema) {
        requestHandlerCallbacks.callTool = callback as (
          request: CallToolRequest,
        ) => Promise<CallToolResult>;
      }
    });

  // Setup mock client
  const client = new Client({
    name: "test",
    version: "1.0.0",
  }) as jest.Mocked<Client>;

  client.callTool = jest.fn().mockResolvedValue({
    content: [{ type: "text", text: MOCK_TOOL_RESPONSE }],
  });

  // Setup mock bundles with a properly typed tool
  const bundles: ClientBundle[] = [
    {
      serverName: TEST_SERVER_NAME,
      client,
      capabilities: {
        tools: [createMockTool(TEST_TOOL_NAME, "A test tool")],
        prompts: [],
        resources: [],
      },
    },
  ];

  // Setup mock modes - allow override in options
  const modes = options.modes ?? DEFAULT_MODES;

  // Setup mock clients
  const clients = {
    [TEST_SERVER_NAME]: client,
  };

  // Setup handlers
  updateRequestHandlers({
    server,
    bundles,
    modes,
    clients,
  });

  return {
    server,
    client,
    bundles,
    modes,
    clients,
    requestHandlerCallbacks,
  };
}

describe("handlers", () => {
  describe("getAndCallToolFromBundle", () => {
    it("should call the tool from the correct bundle", async () => {
      const { bundles, client } = createTestContext();

      const request: CallToolRequest = {
        method: "tools/call",
        params: {
          name: TEST_TOOL_NAME,
          arguments: { test: "value" },
        },
      };

      const result = await getAndCallToolFromBundle({ request, bundles });

      expect(client.callTool).toHaveBeenCalledWith({
        name: TEST_TOOL_NAME,
        arguments: { test: "value" },
      });
      expect(result).toEqual({
        content: [{ type: "text", text: MOCK_TOOL_RESPONSE }],
      });
    });

    it("should return error when tool is not found", async () => {
      const { bundles, client } = createTestContext();

      const request: CallToolRequest = {
        method: "tools/call",
        params: {
          name: "non-existent-tool",
          arguments: {},
        },
      };

      const result = await getAndCallToolFromBundle({ request, bundles });

      expect(client.callTool).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: `ERROR: Tool with the name non-existent-tool couldn't be found.`,
          },
        ],
      });
    });
  });

  describe("handleListModesRequest", () => {
    it("should list available modes", () => {
      const { modes } = createTestContext();

      const result = handleListModesRequest({ modes });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Mock output for default mode\n\nMock output for alternate-mode mode",
          },
        ],
      });
    });
  });

  describe("handleChangeModeRequest", () => {
    it("should change to a valid mode", async () => {
      const { modes, server, clients } = createTestContext();
      const getAllClientBundlesMock = jest.fn().mockResolvedValue([]);

      // Apply mock to the imported module
      jest
        .spyOn(capabilities, "getAllClientBundles")
        .mockImplementation(getAllClientBundlesMock);

      const request: CallToolRequest = {
        method: "tools/call",
        params: {
          name: "change_mode",
          arguments: { mode_name: ALTERNATE_MODE_NAME },
        },
      };

      const result = await handleChangeModeRequest({
        request,
        modes,
        server,
        clients,
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: [
              `Successfully updated mode to ${ALTERNATE_MODE_NAME}.`,
              "If you're an agent, particularly a Cursor agent, then it is critically important",
              "to remind your user to refresh the MCP server, as new tools are available.",
              "If the server is not refreshed, the new tools may not appear as being available.",
            ].join("\n"),
          },
        ],
      });
    });

    it("should handle undefined modes object", async () => {
      const { server, clients } = createTestContext();

      const request: CallToolRequest = {
        method: "tools/call",
        params: {
          name: "change_mode",
          arguments: { mode_name: "any-mode" },
        },
      };

      const result = await handleChangeModeRequest({
        request,
        modes: undefined as unknown as McpModeConfig,
        server,
        clients,
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Mode any-mode not found, please call change_mode with an existing mode.",
          },
        ],
      });
    });

    it("should return error for invalid mode name", async () => {
      const { modes, server, clients } = createTestContext();

      const request: CallToolRequest = {
        method: "tools/call",
        params: {
          name: "change_mode",
          arguments: { mode_name: "non-existent-mode" },
        },
      };

      const result = await handleChangeModeRequest({
        request,
        modes,
        server,
        clients,
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Mode non-existent-mode not found, please call change_mode with an existing mode.",
          },
        ],
      });
    });

    it("should return error for invalid arguments", async () => {
      const { modes, server, clients } = createTestContext();

      const request: CallToolRequest = {
        method: "tools/call",
        params: {
          name: "change_mode",
          arguments: undefined,
        },
      };

      const result = await handleChangeModeRequest({
        request,
        modes,
        server,
        clients,
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Invalid input, please call change_mode with a valid string mode_name.",
          },
        ],
      });
    });
  });

  describe("updateRequestHandlers", () => {
    it("should update request handlers on the server", () => {
      const { server } = createTestContext();
      expect(server.setRequestHandler).toHaveBeenCalledTimes(2);
    });

    it("should return all tools including mode tools when listTools is called", async () => {
      const { requestHandlerCallbacks } = createTestContext();

      expect(requestHandlerCallbacks.listTools).toBeDefined();

      const result = await requestHandlerCallbacks.listTools();

      expect(result).toHaveProperty("tools");
      expect(result.tools.length).toBe(3);
      expect(result.tools).toContainEqual(
        expect.objectContaining({ name: TEST_TOOL_NAME }),
      );
      expect(result.tools).toContainEqual(
        expect.objectContaining({ name: "list_modes" }),
      );
      expect(result.tools).toContainEqual(
        expect.objectContaining({ name: "change_mode" }),
      );
    });

    it("should route list_modes requests to handleListModesRequest", async () => {
      const { requestHandlerCallbacks } = createTestContext();

      expect(requestHandlerCallbacks.callTool).toBeDefined();

      const request: CallToolRequest = {
        method: "tools/call",
        params: {
          name: "list_modes",
          arguments: {},
        },
      };

      const result = await requestHandlerCallbacks.callTool(request);

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "Mock output for default mode\n\nMock output for alternate-mode mode",
          },
        ],
      });
    });

    it("should route change_mode requests to handleChangeModeRequest", async () => {
      const { requestHandlerCallbacks } = createTestContext();

      expect(requestHandlerCallbacks.callTool).toBeDefined();

      const request: CallToolRequest = {
        method: "tools/call",
        params: {
          name: "change_mode",
          arguments: { mode_name: ALTERNATE_MODE_NAME },
        },
      };

      const result = await requestHandlerCallbacks.callTool(request);

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: [
              `Successfully updated mode to ${ALTERNATE_MODE_NAME}.`,
              "If you're an agent, particularly a Cursor agent, then it is critically important",
              "to remind your user to refresh the MCP server, as new tools are available.",
              "If the server is not refreshed, the new tools may not appear as being available.",
            ].join("\n"),
          },
        ],
      });
    });

    it("should route other tool requests to getAndCallToolFromBundle", async () => {
      const { requestHandlerCallbacks, client } = createTestContext();

      expect(requestHandlerCallbacks.callTool).toBeDefined();

      const request: CallToolRequest = {
        method: "tools/call",
        params: {
          name: TEST_TOOL_NAME,
          arguments: { test: "value" },
        },
      };

      const result = await requestHandlerCallbacks.callTool(request);

      expect(client.callTool).toHaveBeenCalledWith({
        name: TEST_TOOL_NAME,
        arguments: { test: "value" },
      });
      expect(result).toEqual({
        content: [{ type: "text", text: MOCK_TOOL_RESPONSE }],
      });
    });
  });
});
