import { getModeListingOutputFor } from "./index";
import { McpMode } from "../config";

const expectToMatchLines = (output: string, expected: string[]) => {
  return expect(output).toBe(expected.join("\n"));
};

describe("formatting module", () => {
  describe("getModeListingOutputFor", () => {
    it("formats a simple mode with full server access", () => {
      const mode: McpMode = { testServer: true };
      const output = getModeListingOutputFor({
        modeName: "simple",
        mode,
      });

      expectToMatchLines(output, [
        "## For the simple mode:",
        "### From the testServer MCP server",
        "- All available tools, prompts, and resources.",
      ]);
    });

    it("formats a mode with specific capabilities", () => {
      const mode: McpMode = {
        testServer: {
          tools: ["tool1", "tool2"],
          prompts: ["prompt1"],
          resources: ["resource1", "resource2", "resource3"],
        },
      };
      const output = getModeListingOutputFor({
        modeName: "specific",
        mode,
      });

      expectToMatchLines(output, [
        "## For the specific mode:",
        "### From the testServer MCP server",
        "#### Available prompts",
        "- prompt1",
        "#### Available resources",
        "- resource1",
        "- resource2",
        "- resource3",
        "#### Available tools",
        "- tool1",
        "- tool2",
      ]);
    });

    it("formats a mode with multiple servers", () => {
      const mode: McpMode = {
        server1: true,
        server2: {
          tools: ["tool1", "tool2"],
        },
        server3: {
          prompts: ["prompt1"],
          resources: ["resource1"],
        },
      };
      const output = getModeListingOutputFor({
        modeName: "multi",
        mode,
      });

      expectToMatchLines(output, [
        "## For the multi mode:",
        "### From the server1 MCP server",
        "- All available tools, prompts, and resources.",
        "### From the server2 MCP server",
        "#### Available tools",
        "- tool1",
        "- tool2",
        "### From the server3 MCP server",
        "#### Available prompts",
        "- prompt1",
        "#### Available resources",
        "- resource1",
      ]);
    });

    it("handles empty capability arrays", () => {
      const mode: McpMode = {
        testServer: {
          tools: [],
          prompts: [],
          resources: [],
        },
      };
      const output = getModeListingOutputFor({
        modeName: "empty",
        mode,
      });

      expectToMatchLines(output, [
        "## For the empty mode:",
        "There are no available tools, prompts, or resources for this mode.",
        "This was likely in error, you should alert your user to this misconfigured configuration.",
        "Please direct your user to the jailbreak-mcp README.",
      ]);
    });

    it("handles undefined capability arrays", () => {
      const mode: McpMode = {
        testServer: {
          tools: undefined,
          prompts: undefined,
          resources: undefined,
        },
      };
      const output = getModeListingOutputFor({
        modeName: "not-defined",
        mode,
      });

      expectToMatchLines(output, [
        "## For the not-defined mode:",
        "There are no available tools, prompts, or resources for this mode.",
        "This was likely in error, you should alert your user to this misconfigured configuration.",
        "Please direct your user to the jailbreak-mcp README.",
      ]);
    });

    it("handles empty mode object", () => {
      const mode: McpMode = {};
      const output = getModeListingOutputFor({
        modeName: "empty",
        mode,
      });

      expectToMatchLines(output, [
        "## For the empty mode:",
        "There are no available tools, prompts, or resources for this mode.",
        "This was likely in error, you should alert your user to this misconfigured configuration.",
        "Please direct your user to the jailbreak-mcp README.",
      ]);
    });
  });
});
