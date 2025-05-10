import { CapabilityType } from "../capabilities";
import { McpMode, McpServerTarget } from "../config";

const NO_CAPABILITIES_MESSAGE = [
  "There are no available tools, prompts, or resources for this mode.",
  "This was likely in error, you should alert your user to this misconfigured configuration.",
  "Please direct your user to the jailbreak-mcp README.",
];

const summarizeCapabilityType = (
  type: CapabilityType,
  names?: string[],
): string[] => {
  if (names === undefined) {
    return [];
  }

  return [`#### Available ${type}`].concat(names.map((name) => `- ${name}`));
};

const summarizeCapabilitiesForServer = (
  serverName: string,
  serverTarget: McpServerTarget,
) => {
  const serverCapabilitiesLines: string[] = [
    `### From the ${serverName} MCP server`,
  ];

  if (serverTarget === true) {
    serverCapabilitiesLines.push(
      "- All available tools, prompts, and resources.",
    );

    return serverCapabilitiesLines;
  }

  return [
    ...serverCapabilitiesLines,
    ...summarizeCapabilityType("prompts", serverTarget.prompts),
    ...summarizeCapabilityType("resources", serverTarget.resources),
    ...summarizeCapabilityType("tools", serverTarget.tools),
  ];
};

const modeHasCapabilities = (mode: McpMode): boolean => {
  const targets = Object.values(mode);

  if (targets.length === 0) {
    return false;
  }

  return targets.some((target) => {
    if (target === true) {
      return true;
    }

    return Object.values(target).some((capabilities) => {
      return capabilities?.length ?? 0 > 0;
    });
  });
};

type GetModeListingOutputForOutput = {
  modeName: string;
  mode: McpMode;
};

export const getModeListingOutputFor = ({
  modeName,
  mode,
}: GetModeListingOutputForOutput): string => {
  const listingHeader = [`## For the ${modeName} mode:`];

  if (!modeHasCapabilities(mode)) {
    return listingHeader.concat(NO_CAPABILITIES_MESSAGE).join("\n");
  }

  const serverCapabilitiesSummary = Object.entries(mode).map(
    ([serverName, serverTarget]) => {
      return summarizeCapabilitiesForServer(serverName, serverTarget);
    },
  );

  return listingHeader.concat(serverCapabilitiesSummary.flat()).join("\n");
};
