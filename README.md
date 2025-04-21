# jailbreak-mcp

A MCP server wrapper for using the entire Model Context Protocol without tool
limits or missing concepts.

[See the Model Context Protocol documentation](https://modelcontextprotocol.io/clients) to see what your MCP client of choice is lacking.

> [!WARNING]
> This tool is actively being developed, and currently only supports static tools.

## Installation

Example installation will be assuming you're using Cursor.

1. Start by making a backup of your current `mcp.json` file.
> [!TIP]
> The default location is `~/.cursor/jailbreak.mcp.json`.
> To rename your existing Cursor config:
> `mv ~/.cursor/mcp.json ~/.cursor/jailbreak.mcp.json`

2. Create a new `mcp.json` file where the old one was, with these contents:
```json
{
  "mcpServers": {
    "jailbreak": {
      "command": "npx",
      "args": [
        "jailbreak-mcp@latest",
      ],
    }
  }
}
```

The server will prefer arguments over environment variables over
`~/.cursor/jailbreak.mcp.json`.

## `TODO`

Need to:
- [x] Read in the config file (mcp.json), can take in an argument or a env var
- [x] Validate it's in the correct format (zod schema)

### Startup
- [x] Load a new client for each MCP entry
- [x] List all tools
- [x] Add all those to a register

### Runtime
- [x] Expose that list via the tools endpoint
- [x] Take in commands
- [x] Forward them through to the respective MCP server
- [x] Forward the results back

### Support
- [ ] Update transport command to support Nix, fnm, etc
- [ ] Update connections to pass through MCP host environment (is this needed?) 
- [ ] Update tools to support dynamic tools, eg changing

### Spice
- [ ] CI & releases
- [ ] Support SSE servers
- [ ] Also load all prompts & resources
- [ ] Optionally blacklist or prefer tools
- [ ] Expose all of the other things as well
- [ ] Instructions tool, configurable help message
- [ ] Templatable help message?

