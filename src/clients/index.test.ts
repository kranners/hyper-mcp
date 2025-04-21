import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { createClients } from "./index";
import { McpConfig } from "../config";

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
      listTools: jest.fn().mockResolvedValue({ tools: [] }),
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

describe("createClients", () => {
  it("creates clients with StdioClientTransport for command configs", async () => {
    const mockConfig: McpConfig = {
      mcpServers: {
        "stdio-server": {
          command: "test-command",
          args: ["arg1", "arg2"],
          env: { TEST_ENV: "value" },
        },
      },
    };

    const clients = await createClients(mockConfig);

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

    expect(clients.length).toBe(1);
    expect(clients[0]).toBeDefined();
  });

  it("creates clients with SSEClientTransport for url configs", async () => {
    const mockConfig: McpConfig = {
      mcpServers: {
        "sse-server": {
          url: "https://test-sse-url.com",
        },
      },
    };

    const clients = await createClients(mockConfig);

    expect(SSEClientTransport).toHaveBeenCalledWith(
      new URL("https://test-sse-url.com"),
    );
    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "jailbreak-mcp-sse-server",
        version: "0.0.0",
      }),
    );
    expect(clients.length).toBe(1);
    expect(clients[0]).toBeDefined();
  });

  it("creates multiple clients of mixed types", async () => {
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

    const clients = await createClients(mockConfig);

    expect(clients).toHaveLength(2);
    expect(StdioClientTransport).toHaveBeenCalledTimes(1);
    expect(SSEClientTransport).toHaveBeenCalledTimes(1);
    expect(Client).toHaveBeenCalledTimes(2);
  });

  it("filters out clients that fail to load", async () => {
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

    const clients = await createClients(mockConfig);

    expect(clients).toHaveLength(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to create client for server",
      expect.anything(),
      expect.any(Error),
    );
  });
});
