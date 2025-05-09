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

export const getAndCallToolFromBundle = async ({
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

export const handleListModesRequest = ({
  modes,
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

type ChangeModeParams = {
  request: CallToolRequest;
  modes: McpModeConfig;
  server: Server;
  clients: ClientRecord;
};

export const handleChangeModeRequest = async ({
  request,
  modes,
  server,
  clients,
}: ChangeModeParams): Promise<CallToolResult> => {
  const newModeName = request.params.arguments?.mode_name;

  if (typeof newModeName !== "string") {
    return {
      content: [
        {
          type: "text",
          text: "Invalid input, please call change_mode with a valid string mode_name.",
        },
      ],
    };
  }

  const newMode = modes?.[newModeName];

  if (newMode === undefined) {
    return {
      content: [
        {
          type: "text",
          text: `Mode ${newModeName} not found, please call change_mode with an existing mode.`,
        },
      ],
    };
  }

  const updatedBundles = await getAllClientBundles({
    clients,
    mode: newMode,
  });

  updateRequestHandlers({
    server,
    bundles: updatedBundles,
    clients,
    modes,
  });

  return {
    content: [
      {
        type: "text",
        text: `Successfully changed to ${newModeName} mode! Please re-check available tools.`,
      },
    ],
  };
};

type RequestHandlerParams = {
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
}: RequestHandlerParams): void => {
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
