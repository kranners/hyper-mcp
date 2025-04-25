import { readFileSync } from "fs";
import { DEFAULT_CONFIG_PATH, getConfigPath, loadConfig } from ".";
import { ZodError } from "zod";

const MOCK_CONFIG_FILES = {
  INVALID_CONFIG: {
    woop: "woop",
  },

  INVALID_CONFIG_WITH_WHITELIST_AND_BLACKLIST: {
    mcpServers: {
      test: {
        command: "echo",
      },
    },
    modes: {
      default: {
        whitelist: {
          test: true,
        },
        blacklist: {
          test: true,
        },
      },
    },
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
          time: true,
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

type MockFileName = keyof typeof MOCK_CONFIG_FILES;

const VALID_CONFIGS: MockFileName[] = [
  "VALID_CONFIG",
  "VALID_CONFIG_WITH_MODES",
  "VALID_CONFIG_WITH_DEFAULT_MODE",
];

const INVALID_CONFIGS: MockFileName[] = [
  "INVALID_CONFIG",
  "INVALID_CONFIG_WITH_WHITELIST_AND_BLACKLIST",
];

jest.mock("fs", () => ({
  readFileSync: jest.fn().mockImplementation((key: MockFileName) => {
    return JSON.stringify(MOCK_CONFIG_FILES[key]);
  }),
}));

describe("loadConfig", () => {
  it("loads from a file", () => {
    loadConfig("VALID_CONFIG");
    expect(readFileSync).toHaveBeenCalledWith("VALID_CONFIG");
  });

  it.each(VALID_CONFIGS)("successfully parses %s", (configKey) => {
    const config = MOCK_CONFIG_FILES[configKey];
    try {
      const parsed = loadConfig(configKey);
      expect(parsed).toMatchObject(config);
    } catch (err) {
      console.error((err as ZodError).format());
      throw err;
    }
  });

  it.each(INVALID_CONFIGS)("fails to parse %s", (configKey) => {
    expect(() => loadConfig(configKey)).toThrow();
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
