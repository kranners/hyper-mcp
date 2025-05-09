import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ClientBundle, getAllClientBundles } from "../capabilities";
import {
  CallToolRequest,
  CallToolRequestSchema,
  CallToolResult,
  CallToolResultSchema,
  ListToolsRequestSchema,
  ListToolsResult,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { McpModeConfig } from "../config";
import { getModeListingOutputFor } from "../formatting";
import { ClientRecord } from "../clients";

const MODE_TOOLS: [Tool, Tool] = [
  {
    name: "list_modes",
    description: "Lists available MCP modes. Will always include default.",
    inputSchema: {
      type: "object",
    },
  },
  {
    name: "change_mode",
    description:
      "Change to a new MCP mode with different tools. Get the available modes with list_modes.",
    inputSchema: {
      type: "object",
      properties: {
        mode_name: {
          type: "string",
          description: "The name of the mode to change to.",
        },
      },
    },
  },
];

type GetAndCallToolFromBundleInput = {
  request: CallToolRequest;
  bundles: ClientBundle[];
};

const getAndCallToolFromBundle = async ({
  request,
  bundles,
}: GetAndCallToolFromBundleInput): Promise<CallToolResult> => {
  const bundleWithTool = bundles.find((bundle) => {
    return bundle.capabilities.tools.some(
      (tool) => tool.name === request.params.name,
    );
  });

  if (bundleWithTool === undefined) {
    return {
      content: [
        {
          type: "text",
          text: `ERROR: Tool with the name ${request.params.name} couldn't be found.`,
        },
      ],
    };
  }

  const result = await bundleWithTool.client.callTool(request.params);
  return CallToolResultSchema.parse(result);
};

type HandleListModesInput = {
  modes: McpModeConfig;
};

const handleListModesRequest = ({
  modes
}: HandleListModesInput): CallToolResult => {
  const modeListingOutput = Object.entries(modes)
    .map(([modeName, mode]) => {
      return getModeListingOutputFor({ modeName, mode });
    })
    .join("\n\n");

  return {
    content: [
      {
        type: "text",
        text: modeListingOutput,
      },
    ],
  };
};

type HandleChangeModeInput = {
  request: CallToolRequest;
  modes: McpModeConfig;
  server: Server;
  bundles: ClientBundle[];
  clients: ClientRecord;
};

const handleChangeModeRequest = async ({
  request,
  modes,
  server,
  bundles,
  clients,
}: HandleChangeModeInput): Promise<CallToolResult> => {
  const modeNameToChangeTo = request.params.arguments?.mode_name;

  if (typeof modeNameToChangeTo !== "string") {
    return {
      content: [
        {
          type: "text",
          text: "Invalid input, please call change_mode with a valid string mode_name.",
        },
      ],
    };
  }

  const modeToChangeTo = modes?.[modeNameToChangeTo];

  if (modeToChangeTo === undefined) {
    return {
      content: [
        {
          type: "text",
          text: `Mode ${modeNameToChangeTo} not found, please call change_mode with an existing mode.`,
        },
      ],
    };
  }

  const newBundles = await getAllClientBundles({
    clients,
    mode: modeToChangeTo,
  });

  updateRequestHandlers({
    server,
    bundles: newBundles,
    clients,
    modes
  });

  return {
    content: [
      {
        type: "text",
        text: `Successfully changed to ${modeNameToChangeTo} mode! Please re-check available tools.`,
      },
    ],
  };
};

type SetRequestHandlersInput = {
  server: Server;
  bundles: ClientBundle[];
  modes: McpModeConfig;
  clients: ClientRecord;
};

export const updateRequestHandlers = ({
  server,
  bundles,
  modes,
  clients,
}: SetRequestHandlersInput): void => {
  server.setRequestHandler(
    ListToolsRequestSchema,
    async (): Promise<ListToolsResult> => {
      const tools = bundles.map((bundle) => bundle.capabilities.tools).flat();
      return { tools: tools.concat(MODE_TOOLS) };
    },
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest): Promise<CallToolResult> => {
      if (request.params.name === "list_modes") {
        return handleListModesRequest({ modes });
      }

      if (request.params.name === "change_mode") {
        return handleChangeModeRequest({
          request,
          modes,
          server,
          bundles,
          clients,
        });
      }

      return getAndCallToolFromBundle({
        request,
        bundles,
      });
    },
  );
};
