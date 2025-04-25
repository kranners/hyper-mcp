import { DEFAULT_CONFIG_PATH, getConfigPath, loadConfig } from ".";

const MOCK_CONFIG_FILES = {
  INVALID_CONFIG: {
    woop: "woop",
  },

  VALID_CONFIG: {
    mcpServers: {
      test: {
        command: "echo",
      },
    },
  },

  VALID_CONFIG_WITH_MODES: {
    mcpServers: {
      test: {
        command: "echo",
      },
      slack: {
        command: "launch the thing",
      },
    },
    modes: {
      default: {
        whitelist: {
          vault: { resources: ["cool-resource"] },
          slack: { tools: ["send-message"] },
        },
      },
    },
  },

  VALID_CONFIG_WITH_DEFAULT_MODE: {
    mcpServers: {
      test: {
        command: "echo",
      },
      slack: {
        command: "launch the thing",
      },
      time: {
        command: "launch the thing",
      },
    },
    defaultMode: "messageSender",
    modes: {
      messageSender: {
        whitelist: {
          vault: { resources: ["coolResource"] },
          slack: { tools: ["sendMessage"] },
          time: true,
        },
      },
    },
  },
};

jest.mock("fs", () => ({
  readFileSync: (key: keyof typeof MOCK_CONFIG_FILES) => {
    return JSON.stringify(MOCK_CONFIG_FILES[key]);
  },
}));

describe("loadConfig", () => {
  it("loads from a file", () => {
    const config = loadConfig("VALID_CONFIG");
    expect(config.mcpServers.test).toMatchObject({
      command: "echo",
    });
  });

  it("fails to load an invalid config", () => {
    expect(() => {
      loadConfig("INVALID_CONFIG");
    }).toThrow();
  });
});

describe("getConfigPath", () => {
  it("defaults to ~/.cursor/jailbreak.mcp.json", () => {
    const configPath = getConfigPath({
      env: {},
      argv: ["node", "./path/to/index.js"],
    });

    expect(configPath).toBe(DEFAULT_CONFIG_PATH);
  });

  it("prefers the CONFIG_PATH env variable over the default", () => {
    const configPath = getConfigPath({
      env: { CONFIG_PATH: "/tmp/env.mcp.json" },
      argv: ["node", "./path/to/index.js"],
    });

    expect(configPath).toBe("/tmp/env.mcp.json");
  });

  it("prefers the first argument over the default", () => {
    const configPath = getConfigPath({
      env: {},
      argv: ["node", "./path/to/index.js", "/tmp/argv.mcp.json"],
    });

    expect(configPath).toBe("/tmp/argv.mcp.json");
  });

  it("prefers the first argument over the CONFIG_PATH", () => {
    const configPath = getConfigPath({
      env: { CONFIG_PATH: "/tmp/env.mcp.json" },
      argv: ["node", "./path/to/index.js", "/tmp/argv.mcp.json"],
    });

    expect(configPath).toBe("/tmp/argv.mcp.json");
  });
});
