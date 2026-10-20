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
  collection: Collection<string, T> = new Collection();
  isType(I: unknown): I is T {
    return (
      I === Object &&
      I !== null &&
      ("data" in I || "name" in I) &&
      "execute" in I
    );
  }
  loadItem(name: string, item: T): void {
    if (!name || !item) return;
    if (this.has(name)) {
      console.warn(`Item ${name} already exists!`);
      return;
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
    this.collection.set(key, value);
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
        console.log("Couldnt find command property 'data'");
        return;
      }
      this.loadItem(command?.data?.name, command);
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
    if (this.commands.size === 0) {
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

  get commands() {
    return this.collection;
  }
}

interface DiscordEvent {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void> | void;
}

class EventManager extends Manager<DiscordEvent> {
  override async loadPath(path: string): Promise<void> {
    if (!path) return;
    const events: DiscordEvent[] = await this._FromPath(path);
    events.forEach((event) => {
      if (!event?.name) {
        console.log("Couldnt find event property 'name'");
        return;
      }
      this.loadItem(event.name, event);
    });
  }

  deploy(client: Client): void {
    this.events.forEach((event) => {
      if (event.once) {
        client.once(event.name, ([...args]) => event.execute([...args]));
      } else {
        client.on(event.name, ([...args]) => event.execute([...args]));
      }
    });
  }

  get events() {
    return this.collection;
  }
}

export { CommandManager, EventManager };
