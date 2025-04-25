import { join } from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let transport: StdioClientTransport;
let client: Client;

beforeAll(async () => {
  transport = new StdioClientTransport({
    command: "node",
    args: [
      join(__dirname, "..", "dist", "index.js"),
      join(__dirname, "..", "test.jailbreak.mcp.json"),
    ],
  });

  client = new Client({
    name: "test-client",
    version: "0.0.0",
  });

  await client.connect(transport);
});

afterAll(async () => {
  await client.close();
  await transport.close();
});

describe("server initialization", () => {
  it("starts correctly and is defined", () => {
    expect(client).toBeInstanceOf(Client);
  });

  it("can be pinged", async () => {
    const pong = await client.ping();

    // ping returns an empty object.
    expect(pong).toMatchObject({});
  });
});
