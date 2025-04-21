import { getAllTools } from "./index";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

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

describe("listTools", () => {
  it("lists all available tools", async () => {
    const result = await getAllTools(mockClients);

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
    const result = await getAllTools([]);

    expect(result).toEqual({
      content: [{ type: "text", text: "[]" }],
    });
  });
});
