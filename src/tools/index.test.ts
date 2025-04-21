import { callTool, listTools } from "./index";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

jest.mock("@modelcontextprotocol/sdk/types.js", () => ({
  ...jest.requireActual("@modelcontextprotocol/sdk/types.js"),
  CallToolResultSchema: {
    parse: jest.fn().mockImplementation((input) => input),
  },
}));

const mockToolWithSchema = (name: string, description: string) => ({
  name,
  description,
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
});

const mockErrorClient = {
  callTool: jest.fn().mockRejectedValue(new Error("Tool execution failed")),
  listTools: jest.fn().mockResolvedValue({
    tools: [mockToolWithSchema("error_tool", "A tool that throws errors")],
  }),
} as unknown as Client;

const mockMultiToolClient = {
  callTool: jest.fn().mockResolvedValue({
    content: [
      { type: "text", text: "Tool result from multi-tool-client" },
    ],
  }),
  listTools: jest.fn().mockResolvedValue({
    tools: [
      mockToolWithSchema("tool1", "Tool 1"),
      mockToolWithSchema("tool2", "Tool 2"),
    ],
  }),
} as unknown as Client;

const mockSingleToolClient = {
  callTool: jest.fn().mockResolvedValue({
    content: [
      { type: "text", text: "Tool result from single-tool-client" },
    ],
  }),
  listTools: jest.fn().mockResolvedValue({
    tools: [mockToolWithSchema("tool3", "Tool 3")],
  }),
} as unknown as Client;

const mockClients = [mockMultiToolClient, mockSingleToolClient];

describe("listTools", () => {
  it("lists all available tools", async () => {
    const result = await listTools(mockClients);

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: expect.stringContaining("tool1"),
        },
      ],
    });

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("tool1");
    expect(result.content[0].text).toContain("tool2");
    expect(result.content[0].text).toContain("tool3");
  });

  it("returns empty content for empty clients array", async () => {
    const result = await listTools([]);

    expect(result).toEqual({
      content: [{ type: "text", text: "[]" }],
    });
  });
});

describe("callTool", () => {
  beforeEach(() => {
    jest.spyOn(mockMultiToolClient, 'listTools').mockResolvedValue({
      tools: [
        mockToolWithSchema("tool1", "Tool 1"),
        mockToolWithSchema("tool2", "Tool 2"),
      ],
    });

    jest.spyOn(mockSingleToolClient, 'listTools').mockResolvedValue({
      tools: [mockToolWithSchema("tool3", "Tool 3")],
    });
  });

  it("calls tools in correct client with arguments", async () => {
    const result = await callTool({
      clients: mockClients,
      name: "tool1",
      toolArguments: { key: "value" },
    });

    expect(mockMultiToolClient.callTool).toHaveBeenCalledWith({
      name: "tool1",
      arguments: { key: "value" },
    });

    expect(result).toEqual({
      content: [
        { type: "text", text: "Tool result from multi-tool-client" },
      ],
    });
  });

  it("calls tools in a different client with arguments", async () => {
    const result = await callTool({
      clients: mockClients,
      name: "tool3",
      toolArguments: { key: "value" },
    });

    expect(mockSingleToolClient.callTool).toHaveBeenCalledWith({
      name: "tool3",
      arguments: { key: "value" },
    });

    expect(result).toEqual({
      content: [
        { type: "text", text: "Tool result from single-tool-client" },
      ],
    });
  });

  it("returns an error message when a tool isn't found", async () => {
    const result = await callTool({
      clients: mockClients,
      name: "non_existent_tool",
      toolArguments: {},
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "ERROR: Tool with the name non_existent_tool couldn't be found.",
        },
      ],
    });
  });

  it("parses and validates the tool result", async () => {
    const result = await callTool({
      clients: mockClients,
      name: "tool1",
      toolArguments: {},
    });

    expect(CallToolResultSchema.parse).toHaveBeenCalled();
    expect(result).toHaveProperty("content");
    expect(Array.isArray(result.content)).toBe(true);
  });

  it("passes errors from clients through", async () => {
    jest.spyOn(mockErrorClient, 'listTools').mockResolvedValue({
      tools: [mockToolWithSchema("error_tool", "A tool that throws errors")],
    });

    await expect(
      callTool({
        clients: [mockErrorClient],
        name: "error_tool",
        toolArguments: {},
      }),
    ).rejects.toThrow();
  });
});
