import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { createConnections } from "./index";
import { McpConfig } from "../config";

const MOCK_TOOL = { name: "test_tool", description: "A test tool" };

jest.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: jest.fn().mockImplementation(({ name }: { name: string }) => {
    if (name === "jailbreak-mcp-failing-server") {
      return {
        connect: jest.fn().mockRejectedValue(new Error("Connection failed")),
        listTools: jest.fn(),
      };
    }

    return {
      connect: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue([MOCK_TOOL]),
    };
  }),
}));

const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

jest.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: jest.fn(),
}));

jest.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: jest.fn(),
}));

describe("createConnections", () => {
  it("creates connections with StdioClientTransport for command configs", async () => {
    const mockConfig: McpConfig = {
      mcpServers: {
        "stdio-server": {
          command: "test-command",
          args: ["arg1", "arg2"],
          env: { TEST_ENV: "value" },
        },
      },
    };

    const [connection] = await createConnections(mockConfig);

    expect(StdioClientTransport).toHaveBeenCalledWith({
      command: "test-command",
      args: ["arg1", "arg2"],
      env: expect.objectContaining({ TEST_ENV: "value" }),
    });

    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "jailbreak-mcp-stdio-server",
        version: "0.0.0",
      }),
    );

    expect(connection.name).toBe("stdio-server");
    expect(connection.client).toBeDefined();
    expect(connection.tools).toEqual([MOCK_TOOL]);
  });

  it("creates connections with SSEClientTransport for url configs", async () => {
    const mockConfig: McpConfig = {
      mcpServers: {
        "sse-server": {
          url: "https://test-sse-url.com",
        },
      },
    };

    const [connection] = await createConnections(mockConfig);

    expect(SSEClientTransport).toHaveBeenCalledWith(
      new URL("https://test-sse-url.com"),
    );
    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "jailbreak-mcp-sse-server",
        version: "0.0.0",
      }),
    );
    expect(connection.name).toBe("sse-server");
    expect(connection.client).toBeDefined();
    expect(connection.tools).toEqual([MOCK_TOOL]);
  });

  it("creates multiple connections of mixed types", async () => {
    const mockConfig: McpConfig = {
      mcpServers: {
        "stdio-server": {
          command: "test-command",
          args: ["arg1", "arg2"],
          env: { TEST_ENV: "value" },
        },
        "sse-server": {
          url: "https://test-sse-url.com",
        },
      },
    };

    const connections = await createConnections(mockConfig);

    expect(connections).toHaveLength(2);
    expect(StdioClientTransport).toHaveBeenCalledTimes(1);
    expect(SSEClientTransport).toHaveBeenCalledTimes(1);
    expect(Client).toHaveBeenCalledTimes(2);

    // Verify both connections were created with correct names
    const names = connections.map((connection) => connection.name);
    expect(names).toContain("stdio-server");
    expect(names).toContain("sse-server");
  });

  it("filters out connections that fail to load", async () => {
    const mockConfig: McpConfig = {
      mcpServers: {
        "working-server": {
          command: "working-command",
          args: [],
        },
        "failing-server": {
          command: "failing-command",
          args: [],
        },
      },
    };

    const connections = await createConnections(mockConfig);

    // Should only have one working connection
    expect(connections).toHaveLength(1);
    expect(connections[0].name).toBe("working-server");

    // Verify console.error was called with the right message
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load failing-server",
      expect.any(Error),
    );
  });
});
