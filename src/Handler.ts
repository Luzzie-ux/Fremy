import {
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Collection,
  REST,
  Routes,
  Interaction,
} from "discord.js";

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

interface SlashCommand {
  data: SlashCommandBuilder;
  execute(i: ChatInputCommandInteraction): Promise<void>;
}

interface ContextCommand {
  data: ContextMenuCommandBuilder;
  execute(i: ContextMenuCommandInteraction): Promise<void>;
}

type Command = SlashCommand | ContextCommand;

class BaseHandler {
  _commands: Collection<string, Command> = new Collection();
  constructor() {}
  isCommand(c: unknown): c is Command {
    return typeof c === "object" && c !== null && "data" in c && "execute" in c;
  }
  isSlash(c: Command): c is SlashCommand {
    return c.data instanceof SlashCommandBuilder;
  }
  isContext(c: Command): c is ContextCommand {
    return c.data instanceof ContextMenuCommandBuilder;
  }

  loadCommand(name: string, command: Command): void {
    if (!name || !command || name !== command.data.name) return;
    if (this.commands.has(name)) {
      console.log(`Command ${name} already exists, keeping oldest`);
      return;
    }
    this.commands.set(name, command);
  }

  loadList(list: Record<string, Command>): void {
    if (!list) return;
    Object.entries(list).forEach((entry) => {
      const [key, value] = entry;
      this.loadCommand(key, value);
    });
  }

  async loadPath(path: string): Promise<void> {
    if (!path) return;
    const files = [...readAllFiles(path)].filter((file) =>
      file.endsWith(".js"),
    );
    try {
      const imports = await Promise.all(
        files.map((file) => import(pathToFileURL(file).href)),
      );
      const commands: Command[] = imports.flatMap((mod) =>
        Object.getOwnPropertyNames(mod)
          .map((name) => mod[name])
          .filter((exp): exp is Command => this.isCommand(exp)),
      );
      commands.forEach((command) => {
        this.loadCommand(command.data.name, command);
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.log(err.message);
      }
      throw err;
    }
  }

  async load(commands: string | Record<string, Command>): Promise<void> {
    if (!commands) return;
    if (typeof commands !== "string") {
      this.loadList(commands);
    } else {
      await this.loadPath(commands);
    }
  }

  async register(required: {
    token: string;
    clientId: string;
    guildId?: string;
  }): Promise<void> {
    if (!required.token.trim() || !required.clientId.trim()) {
      throw new Error("token and clientId are required");
    }

    const rest = new REST().setToken(required.token);
    if (this._commands.size === 0) {
      console.log("[WARNING] The commands list is empty, aborting");
      return;
    }
    const body = this.values.map((c) => c.data.toJSON());
    let data: unknown[];
    try {
      console.log(
        `Started refreshing ${body.length} application (/) commands.`,
      );
      if (required.guildId) {
        data = (await rest.put(
          Routes.applicationGuildCommands(required.clientId, required.guildId),
          { body },
        )) as unknown[];
      } else {
        data = (await rest.put(Routes.applicationCommands(required.clientId), {
          body,
        })) as unknown[];
      }
      console.log(
        `Successfully reloaded ${data.length} application (/) commands.`,
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
      throw err;
    }
  }

  async dispatch(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;

    const command = this._commands.get(interaction.commandName);
    if (!command) return;

    try {
      if (interaction.isChatInputCommand() && this.isSlash(command)) {
        await command.execute(interaction);
      } else if (
        interaction.isContextMenuCommand() &&
        this.isContext(command)
      ) {
        await command.execute(interaction);
      }
    } catch (err: unknown) {
      console.error(err);
      if (interaction.isRepliable()) {
        const msg = {
          content: "Something went wrong.",
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred)
          await interaction.followUp(msg);
        else await interaction.reply(msg);
      }
    }
  }

  get keys() {
    return [...this._commands.keys()];
  }
  get values() {
    return [...this._commands.values()];
  }

  get(key: string) {
    if (!key) return undefined;
    return this._commands.get(key);
  }
  get commands() {
    return this._commands;
  }
}

function* readAllFiles(dir: string): Generator<string> {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      yield* readAllFiles(path.join(dir, file.name));
    } else {
      yield path.join(dir, file.name);
    }
  }
}

export type { Command };
export { BaseHandler };
