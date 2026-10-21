import {
  Collection,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  Client,
  Routes,
  REST,
  MessageFlags,
} from "discord.js";

import type { Interaction, InteractionReplyOptions } from "discord.js";
import { ImportPath } from "./utils.ts";

abstract class Manager<T> {
  static count = 0;
  collection: Collection<string, T> = new Collection();
  isType(value: unknown): value is T {
    return (
      typeof value === "object" &&
      value !== null &&
      (("data" in value &&
        (value.data instanceof SlashCommandBuilder ||
          value.data instanceof ContextMenuCommandBuilder)) ||
        "name" in value) &&
      "execute" in value &&
      typeof value.execute === "function"
    );
  }
  loadItem(name: string, item: T): void {
    const newName = `(${Manager.count})${name}`;
    if (!name || !item) return;
    if (this.has(name) || this.has(newName)) {
      console.warn(`Item ${name} already exists!`);
      console.warn(`saving as ${newName}`);
      this.set(newName, item);
      Manager.count++;
    }
    this.set(name, item);
  }
  loadList(list: Record<string, T>): void {
    if (!list) return;
    Object.entries(list).forEach((entry) => {
      const [key, value] = entry;
      this.loadItem(key, value);
    });
  }
  async _FromPath(path: string): Promise<T[]> {
    const imports = await ImportPath(path);
    if (!imports) throw new Error("Error when importing files");
    return imports.flatMap((mod) =>
      Object.getOwnPropertyNames(mod)
        .map((name) => mod[name])
        .filter((mod): mod is T => this.isType(mod)),
    );
  }
  abstract loadPath(path: string): Promise<void>;
  get keys() {
    return [...this.collection.keys()];
  }
  get values() {
    return [...this.collection.values()];
  }
  get(key: string) {
    return this.collection.get(key);
  }
  set(key: string, value: T) {
    return this.collection.set(key, value);
  }
  has(key: string) {
    return this.collection.has(key);
  }
}

interface DiscordCommand {
  data: SlashCommandBuilder | ContextMenuCommandBuilder;
  execute: (i: Interaction) => Promise<void>;
}

class CommandManager extends Manager<DiscordCommand> {
  isSlash(c: DiscordCommand) {
    return c.data instanceof SlashCommandBuilder;
  }
  isContext(c: DiscordCommand) {
    return c.data instanceof ContextMenuCommandBuilder;
  }
  override async loadPath(path: string): Promise<void> {
    if (!path) return;
    const commands: DiscordCommand[] = await this._FromPath(path);
    commands.forEach((command) => {
      if (!command?.data) {
        console.warn("Couldnt find command property 'data'");
        return;
      }
      const type = command.data.toJSON().type ?? 1;
      this.loadItem(`${type}:${command.data.name}`, command);
    });
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
    const body = this.values.map((c) => c.data.toJSON());
    try {
      let data: unknown[];
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
      console.error(`Error while registring commands`, err);
      throw err;
    }
  }

  async dispatch(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;

    const command = this.get(
      `${interaction.commandType}:${interaction.commandName}`,
    );
    if (!command) return;

    try {
      if (interaction.isChatInputCommand() && this.isSlash(command)) {
        await command.execute(interaction);
      } else if (
        interaction.isContextMenuCommand() &&
        this.isContext(command)
      ) {
        await command.execute(interaction);
      } else throw new Error(`Unknown command type ${interaction.commandName}`);
    } catch (err: unknown) {
      console.error(`Error with command ${interaction.commandName}`, err);
      if (interaction.isRepliable()) {
        const msg: InteractionReplyOptions = {
          content: "Something went wrong.",
          flags: MessageFlags.Ephemeral,
        };
        if (interaction.replied || interaction.deferred)
          await interaction.followUp(msg);
        else await interaction.reply(msg);
      }
    }
  }
}

interface DiscordEvent {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
}

class EventManager extends Manager<DiscordEvent> {
  override async loadPath(path: string): Promise<void> {
    if (!path) return;
    const events: DiscordEvent[] = await this._FromPath(path);
    events.forEach((event) => {
      if (!event?.name) {
        console.warn("Couldnt find event property 'name'");
        return;
      }
      this.loadItem(event.name, event);
    });
  }

  deploy(client: Client): void {
    this.collection.forEach((event) => {
      const handler = async (...args: unknown[]) => {
        try {
          event.execute(...args);
        } catch (err: unknown) {
          console.error(`Error in event ${event.name}`, err);
        }
      };

      if (event.once) {
        client.once(event.name, handler);
      } else {
        client.on(event.name, handler);
      }
    });
  }
}

export { Manager, CommandManager, EventManager, DiscordEvent, DiscordCommand };
