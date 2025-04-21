import { callTool } from "./index";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

jest.mock("@modelcontextprotocol/sdk/types.js", () => ({
  ...jest.requireActual("@modelcontextprotocol/sdk/types.js"),
  CallToolResultSchema: {
    parse: jest.fn().mockImplementation((input) => input),
  },
}));

const mockTool = (name: string) => ({
  name,
  description: name,
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
});

const mockErrorClient = {
  callTool: jest.fn().mockRejectedValue(new Error("Tool execution failed")),
  listTools: jest.fn().mockResolvedValue({
    tools: [mockTool("error_tool")],
  }),
} as unknown as Client;

const mockMultiToolClient = {
  callTool: jest.fn().mockResolvedValue({
    content: [{ type: "text", text: "Tool result from multi-tool-client" }],
  }),
  listTools: jest.fn().mockResolvedValue({
    tools: [mockTool("tool1"), mockTool("tool2")],
  }),
} as unknown as Client;

const mockSingleToolClient = {
  callTool: jest.fn().mockResolvedValue({
    content: [{ type: "text", text: "Tool result from single-tool-client" }],
  }),
  listTools: jest.fn().mockResolvedValue({
    tools: [mockTool("tool3")],
  }),
} as unknown as Client;

const mockClients = [mockMultiToolClient, mockSingleToolClient];

describe("callTool", () => {
  beforeEach(() => {
    jest.spyOn(mockMultiToolClient, "listTools").mockResolvedValue({
      tools: [mockTool("tool1"), mockTool("tool2")],
    });

    jest.spyOn(mockSingleToolClient, "listTools").mockResolvedValue({
      tools: [mockTool("tool3")],
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
      content: [{ type: "text", text: "Tool result from multi-tool-client" }],
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
      content: [{ type: "text", text: "Tool result from single-tool-client" }],
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
    jest.spyOn(mockErrorClient, "listTools").mockResolvedValue({
      tools: [mockTool("error_tool")],
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
