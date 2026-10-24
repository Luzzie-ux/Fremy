# Fremy

**A small discord.js framework for building Discord bots with very little setup.**

Fremy was created to make Discord bots easy to start, while learning JavaScript/TypeScript along the way. Give it a config, point it at folders of commands and events, and it handles loading, registering and dispatching for you.

> Some JavaScript/TypeScript fundamentals are recommended before using it.

## Features

- Start a bot from a JSON config or from environment variables
- Load commands and events from a directory, or pass them in as objects
- Automatic slash command registration (per guild or globally)
- Built-in interaction dispatching with a safe "Something went wrong." fallback reply
- Ships with default commands and events (`/ping`, `/user`, `/kill`, `/reload`, and a `ready` logger)

## Requirements

- Node.js with `fs.globSync` support (Node 22 or newer)
- A Discord bot token (from the [Discord Developer Portal](https://discord.com/developers/applications))

## Installation

```bash
npm install Fremy
```

## Configuration

Fremy takes a plain object, typically loaded from a `.json` file:

```json
{
  "token": "your token goes here",
  "intents": ["Guilds", "GuildMessages"],
  "clientId": "your bot's ID goes here",
  "guildId": "your server's ID goes here",
  "anything else": "goes into extras"
}
```

| Key        | Required | Default      | Description                                                              |
| ---------- | -------- | ------------ | ------------------------------------------------------------------------ |
| `token`    | yes      | -            | Your bot token.                                                          |
| `intents`  | no       | `["Guilds"]` | Names from discord.js `GatewayIntentBits`. Invalid names throw an error. |
| `clientId` | no*      | `""`         | Your bot's application ID. *Needed to register commands.                 |
| `guildId`  | no       | `""`         | If set, commands are registered only in that server; otherwise globally. |
| other keys | no       | -            | Stored in `bot.extras`.                                                  |

### Using environment variables

`Fremy.fromEnv()` reads variables starting with a prefix (default `DISCORD_`) and converts them to camelCase keys:

```
DISCORD_TOKEN=...
DISCORD_INTENTS=Guilds,GuildMessages
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...
```

```ts
import { Fremy } from "Fremy";

const bot = Fremy.fromEnv(); // prefix "DISCORD_"
const other = Fremy.fromEnv(process.env, "MYBOT_"); // custom prefix
```

Any matching variable whose value is `undefined` (or the string `"undefined"`) causes an error listing the offending keys.

## Quick start

```ts
import { Fremy } from "Fremy";
import config from "./config.json" with { type: "json" };

const bot = new Fremy(config);
bot.createClient();
await bot.startClient();
```

If your `clientId` is blank, set it before starting:

```ts
bot.clientId = "Your bot ID";
await bot.startClient();
```

### What `startClient(loadDefaults = true)` does

1. Loads the default commands and events (when `loadDefaults` is `true`), plus a handler that dispatches `InteractionCreate` events to your commands
2. Registers all loaded commands with Discord
3. Deploys all loaded events on the client
4. Logs the client in

Passing `false` skips the defaults. In that case, no interaction handler is added, so you need to provide your own `InteractionCreate` event that calls `bot.dispatchCmds(interaction)`.

## Writing commands

A command is an object with a `data` builder (`SlashCommandBuilder` or `ContextMenuCommandBuilder`) and an async `execute` function:

```ts
import { Interaction, SlashCommandBuilder } from "discord.js";

export const ping = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("ping command"),
  execute: async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await interaction.reply("Pong!");
  },
};
```

## Writing events

An event has a `name` (a value from discord.js `Events`), an optional `once` flag, and an `execute` function:

```ts
import { Events, Client } from "discord.js";

export const ready = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    console.log(`Ready! Logged in as ${client.user?.tag}`);
  },
};
```

## Loading your own commands and events

Both `loadCmds` and `loadEvents` accept either a directory path or an object of items. Call them **before** `startClient()`.

```ts
// From a directory (every .js/.ts file, recursively)
await bot.loadCmds("./dist/Commands");
await bot.loadEvents("./dist/Events");

// From objects
await bot.loadCmds({ ping });
await bot.loadEvents({ ready });
```

Notes on directory loading:

- Files matching `**/*.{js,ts}` are loaded; `*.d.ts` and `*.test.*` files are skipped
- Every export of each file is checked; invalid exports log a warning and are ignored
- Items with a duplicate name are skipped with an error message
- Use ECMAScript-style imports/exports in your command and event files. If you test with CommonJS, require your files explicitly:

```js
const { YourCommand } = require("your/command/file.js");
```

## Default commands

| Command   | Description                                                      |
| --------- | ---------------------------------------------------------------- |
| `/ping`   | Replies with `Pong!`                                             |
| `/user`   | Replies with your username and, in a server, when you joined     |
| `/kill`   | Announces it is going offline and destroys the client            |
| `/reload` | Placeholder; meant to reload commands without restarting the bot |

Default files are read from `./node_modules/Fremy/dist/Commands` and `./node_modules/Fremy/dist/Events`.

## API overview

| Member                                    | Description                                      |
| ----------------------------------------- | ------------------------------------------------ |
| `new Fremy(config)`                       | Create an instance from a config object          |
| `Fremy.fromEnv(env?, prefix?)`            | Create an instance from environment variables    |
| `createClient()`                          | Create and return the discord.js `Client`        |
| `startClient(loadDefaults?)`              | Load, register, deploy and log in                |
| `stopClient()`                            | Destroy the client                               |
| `loadCmds(pathOrObject)`                  | Load commands                                    |
| `loadEvents(pathOrObject)`                | Load events                                      |
| `registerCmds()`                          | Register loaded commands with Discord            |
| `dispatchCmds(interaction)`               | Run the matching command for an interaction      |
| `deployEvents(client)`                    | Attach loaded events to a client                 |
| `addIntents(intents)`                     | Add intents by name or `GatewayIntentBits` value |
| `addExtra(key, value)`                    | Store extra data on the instance                 |
| `clientId`, `guildId`, `extras`           | Getters/setters for config values                |
| `intents`, `client`, `commands`, `events` | Read-only accessors                              |

Also exported: `Manager`, `CommandManager`, `EventManager`, the `DiscordJSCommand` / `DiscordJSEvent` types, and the type guards `isSlash`, `isContext`, `isEvent`.

## Development

```bash
npm run lint    # eslint
npm run build   # clean dist/ and compile with tsc
npm run dist    # lint, then build
```

Source lives in `src/`, compiled output goes to `dist/`, and type declarations to `typings/`.

## License

Released under the [Apache License 2.0](LICENSE).

## Author

Made by [Luzzie-ux](https://github.com/Luzzie-ux)
Contact: [estelarodrigoluz@gmail.com](mailto:estelarodrigoluz@gmail.com)
