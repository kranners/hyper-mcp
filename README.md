[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/kranners-jailbreak-mcp-badge.png)](https://mseep.ai/app/kranners-jailbreak-mcp)

# jailbreak-mcp

A MCP server wrapper for using the entire Model Context Protocol without tool
limits, missing concepts, or context overload.

> [!WARNING]
> This tool is actively being developed. Watch out! 🐉

## Why does this exist?

MCP servers could be ✨ amazing ✨ but using them comes with a few caveats.

---
**Your client is probably missing most of the actual protocol**.
There are many capabilities listed in the MCP:
- Tools, which are like functions.
- Resources, which are like values.
- Prompts, which are prompts.

As of writing, almost no MCP client (Cursor, Claude Desktop, Cherry Studio) implements all of them.
If you are a Cursor user, you can only use tools.

[See the Model Context Protocol documentation](https://modelcontextprotocol.io/clients) to see what your MCP client of choice is lacking.

Admittedly this isn't the biggest deal - most servers just use tools anyway.
This may become a bigger deal in future if more servers start to implement more of the protocol.

> [!WARNING]
> This bit isn't done yet! It's currently tools only.

Jailbreak-MCP remedies this by exposing configured resources and prompts as
tools, so even the most restrictive implementations are fully usable.

---
**MCP servers fill the context window**

The more tools you have configured, the more your MCP servers are taking up of
the all-important context window of your agent.

If you wanted to use tools or information from multiple MCP servers at once,
your context window becomes very small very fast.

To remedy this, some clients have implemented warnings about having too many
tools configured at once. Cursor has implemented a hard restriction of 40
tools, but hides which tools are disabled at any given moment.

Some servers expose _many_ tools at the same time. The GitHub MCP server alone
fills the entire Cursor tool cap.

The best thing you can do currently is manually enable and disable which MCP
servers you want to have turned on at any given moment.

JailbreakMCP fixes this by providing configurable "modes" which expose only the
exact tools and resources you need to do a given task, and tools to switch
between modes on the fly.

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
        "/optional/path/to/jailbreak.mcp.json",
      ],
      "env": {
        "CONFIG_PATH": "/optional/path/to/jailbreak.mcp.json"
      }
    }
  }
}
```

The server will prefer arguments over environment variables over
`~/.cursor/jailbreak.mcp.json`.

3. From here, you need to configure a `default` mode.
```json
{
  "mcpServers": {
    ...
  },
  "modes": {
    "default": {
      "everything": {
        "tools": [
          "echo",
          "add",
          "longRunningOperation"
        ],
        "prompts": [
          "simple_prompt",
          "complex_prompt",
          "resource_prompt"
        ],
        "resources": [
          "test://static/resource/1",
          "test://static/resource/2"
        ]
      },
      "time": true
    }
  }
}
```

## Configuration

### Modes

Each mode is a whitelist of available servers, and any particular
tools/prompts/capabilities to allow.

Modes are key/value pairs under the `modes` key in the config.

```json
{
    "mcpServers": {
        ...
    },
    "modes": {
        "default": {
            ...
        },
        "anotherModeName": {
            ...
        }
    }
}
```

Under each mode are keys of the names of the servers to allow (the same name as
defined under `mcpServers`).

To allow everything for a given server, set its value to `true`.

```json
{
    "modes": {
        "admin": {
            "email": true,
            "slack": true,
            "time": true,
        }
    }
}
```

To be more specific, specify which tools, prompts, and resources you want as a
list of names or resource URIs.

```json
{
    "modes": {
        "admin": {
            "time": true,
            "email": {
                "tools": [
                    "read_email",
                    "send_email",
                    "list_inbox"
                ]
            },
            "slack": {
                "tools": [
                    "slack_list_channels",
                    "slack_get_channel_history",
                    "slack_get_thread_replies",
                    "slack_get_users",
                    "slack_get_user_profile"
                ]
            },
            "everything": {
                "tools": [
                    "echo",
                    "add",
                    "longRunningOperation"
                ],
                "prompts": [
                    "simple_prompt",
                    "complex_prompt",
                    "resource_prompt"
                ],
                "resources": [
                    "test://static/resource/1",
                    "test://static/resource/2"
                ]
            },
        }
    }
}
```

## `TODO`

Need to:
- [x] Read in the config file (mcp.json), can take in an argument or a env var
- [x] Validate it's in the correct format (zod schema)

### Startup
- [x] Load a new client for each MCP entry
- [x] List all tools
- [x] Add all those to a register
- [ ] `create-jailbreak` package for `npm init jailbreak` setup

### Runtime
- [x] Expose that list via the tools endpoint
- [x] Take in commands
- [x] Forward them through to the respective MCP server
- [x] Forward the results back

### Support
- [ ] Update transport command to support Nix, fnm, etc
- [x] Update connections to pass through MCP host environment (is this needed?) 
- [ ] Update tools to support dynamic tools, eg changing

### Spice
- [x] CI & releases
- [ ] Support SSE servers
- [x] Also load all prompts & resources
- [x] Optionally exclude or prefer tools
- [ ] Expose all of the other things as well
- [ ] Instructions, dynamic?
    - [ ] Templatable help message?

