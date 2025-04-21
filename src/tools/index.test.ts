import { callTool, listTools } from "./index";
import { Connection } from "../clients";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

jest.mock("@modelcontextprotocol/sdk/types.js", () => ({
  ...jest.requireActual("@modelcontextprotocol/sdk/types.js"),
  CallToolResultSchema: {
    parse: jest.fn().mockImplementation((input) => input),
  },
}));

const mockErrorConnection = {
  name: "errorConnection",
  client: {
    callTool: jest.fn().mockRejectedValue(new Error("Tool execution failed")),
  },
  tools: {
    tools: [{ name: "error_tool", description: "A tool that throws errors" }],
  },
} as unknown as Connection;

const mockMultiToolConnection = {
  name: "multi-tool-connection",
  client: {
    callTool: jest.fn().mockResolvedValue({
      content: [
        { type: "text", text: "Tool result from multi-tool-connection" },
      ],
    }),
  },
  tools: {
    tools: [
      { name: "tool1", description: "Tool 1" },
      { name: "tool2", description: "Tool 2" },
    ],
  },
} as unknown as Connection;

const mockSingleToolConnection = {
  name: "single-tool-connection",
  client: {
    callTool: jest.fn().mockResolvedValue({
      content: [
        { type: "text", text: "Tool result from single-tool-connection" },
      ],
    }),
  },
  tools: {
    tools: [{ name: "tool3", description: "Tool 3" }],
  },
} as unknown as Connection;

const mockConnections = [mockMultiToolConnection, mockSingleToolConnection];

describe("listTools", () => {
  it("lists all available tools", () => {
    const result = listTools(mockConnections);

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: expect.stringContaining(
            JSON.stringify(mockMultiToolConnection.tools),
          ),
        },
      ],
    });

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("tool1");
    expect(result.content[0].text).toContain("tool2");
    expect(result.content[0].text).toContain("tool3");
  });

  it("returns empty content for empty connections array", () => {
    const result = listTools([]);

    expect(result).toEqual({
      content: [{ type: "text", text: "" }],
    });
  });
});

describe("callTool", () => {
  it("calls tools in correct connection with arguments", async () => {
    const result = await callTool({
      connections: mockConnections,
      name: "tool1",
      toolArguments: { key: "value" },
    });

    expect(mockMultiToolConnection.client.callTool).toHaveBeenCalledWith({
      name: "tool1",
      arguments: { key: "value" },
    });

    expect(result).toEqual({
      content: [
        { type: "text", text: "Tool result from multi-tool-connection" },
      ],
    });
  });

  it("calls tools in a different connection with arguments", async () => {
    const result = await callTool({
      connections: mockConnections,
      name: "tool3",
      toolArguments: { key: "value" },
    });

    expect(mockSingleToolConnection.client.callTool).toHaveBeenCalledWith({
      name: "tool3",
      arguments: { key: "value" },
    });

    expect(result).toEqual({
      content: [
        { type: "text", text: "Tool result from single-tool-connection" },
      ],
    });
  });

  it("returns an error message when a tool isn't found", async () => {
    const result = await callTool({
      connections: mockConnections,
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
      connections: mockConnections,
      name: "tool1",
      toolArguments: {},
    });

    expect(CallToolResultSchema.parse).toHaveBeenCalled();
    expect(result).toHaveProperty("content");
    expect(Array.isArray(result.content)).toBe(true);
  });

  it("passes errors from clients through", async () => {
    await expect(
      callTool({
        connections: [mockErrorConnection],
        name: "error_tool",
        toolArguments: {},
      }),
    ).rejects.toThrow();
  });
});
