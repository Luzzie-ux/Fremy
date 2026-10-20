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

import { ImportPath } from "./utils.js";

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
    if (this.has(name)) {
      console.log(`Command ${name} already exists, keeping oldest`);
      return;
    }
    this.set(name, command);
  }

  loadCommandList(list: Record<string, Command>): void {
    if (!list) return;
    Object.entries(list).forEach((entry) => {
      const [key, value] = entry;
      this.loadCommand(key, value);
    });
  }

  async loadCommandPath(path: string): Promise<void> {
    if (!path) return;
    try {
      const imports = await ImportPath(path);
      if (!imports) throw new Error("Error when importing commands");
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

  async registerCommands(required: {
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

  async dispatchCommands(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;

    const command = this.get(interaction.commandName);
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

  get commands() {
    return this._commands;
  }
  get keys() {
    return [...this.commands.keys()];
  }
  get values() {
    return [...this.commands.values()];
  }

  get(key: string) {
    return this.commands.get(key);
  }

  set(key: string, value: Command) {
    this.commands.set(key, value);
  }

  has(key: string) {
    return this.commands.has(key);
  }
}

export type { Command };
export { BaseHandler };
