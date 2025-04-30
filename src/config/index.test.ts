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
        invalid_property: "echo",
      },
    },
    modes: {
      default: {
        test: true,
      },
    },
  },

  VALID_CONFIG: {
    mcpServers: {
      test: {
        command: "echo",
      },
    },
    modes: {
      default: {}
    }
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
        include: {
          vault: { resources: ["cool-resource"] },
          slack: { tools: ["send-message"] },
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

  it("successfully parses VALID_CONFIG", () => {
    const config = MOCK_CONFIG_FILES["VALID_CONFIG"];
    const parsed = loadConfig("VALID_CONFIG");
    expect(parsed).toMatchObject(config);
  });

  it("successfully parses VALID_CONFIG_WITH_MODES", () => {
    const parsed = loadConfig("VALID_CONFIG_WITH_MODES");
    expect(parsed).toHaveProperty("mcpServers");
    expect(parsed).toHaveProperty("modes");
    expect(parsed.mcpServers).toHaveProperty("test");
    expect(parsed.mcpServers).toHaveProperty("slack");
    expect(parsed.modes).toHaveProperty("default");
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
