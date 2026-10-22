import {
  Collection,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  Routes,
  REST,
  MessageFlags,
  Events,
} from "discord.js";

import type { Client, Interaction, InteractionReplyOptions } from "discord.js";
import { ImportPath } from "./utils.js";

abstract class Manager<T> {
  collection: Collection<string, T> = new Collection();
  abstract isType(value: unknown): value is T;
  loadItem(name: string, item: T): void {
    if (!name || !item) return;
    if (this.has(name)) {
      console.error(`Item ${name} already exists!`);
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
    if (!imports) throw new Error("Problem with Importing given files");
    return [...new Set<T>(imports.flatMap((mod) => Object.values(mod)))];
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

interface DiscordJSCommand {
  data: SlashCommandBuilder | ContextMenuCommandBuilder;
  execute: (i: Interaction) => Promise<void>;
}

class CommandManager extends Manager<DiscordJSCommand> {
  override isType(value: unknown): value is DiscordJSCommand {
    if (typeof value !== "object" || !value) return false;
    return (
      "data" in value &&
      (this.isSlash(value.data) || this.isContext(value.data)) &&
      "execute" in value &&
      typeof value.execute === "function"
    );
  }
  isSlash(data: unknown): data is SlashCommandBuilder {
    return data instanceof SlashCommandBuilder;
  }
  isContext(data: unknown): data is ContextMenuCommandBuilder {
    return data instanceof ContextMenuCommandBuilder;
  }

  override async loadPath(path: string): Promise<void> {
    if (!path) return;
    const commands: DiscordJSCommand[] = (await this._FromPath(path)).filter(
      (mod): mod is DiscordJSCommand => this.isType(mod),
    );
    commands.forEach((command) => {
      this.loadItem(command.data.name, command);
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
    } catch (dispatchErr: unknown) {
      const reason =
        dispatchErr instanceof Error ? dispatchErr.message : dispatchErr;
      console.error(`Error while registring commands`, reason);
      throw dispatchErr;
    }
  }

  async dispatch(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;
    const command = this.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : err;
      console.error(`Command ${interaction.commandName} failed - ${reason}`);
      await this._replyWithError(interaction);
    }
  }

  private async _replyWithError(interaction: Interaction): Promise<void> {
    if (!interaction.isRepliable()) return;
    const msg: InteractionReplyOptions = {
      content: "Something went wrong.",
      flags: MessageFlags.Ephemeral,
    };
    try {
      if (interaction.replied || interaction.deferred)
        await interaction.followUp(msg);
      else await interaction.reply(msg);
    } catch (replyErr: unknown) {
      console.error(
        "Failed to send error response:",
        replyErr instanceof Error ? replyErr.message : replyErr,
      );
    }
  }
}

interface DiscordJSEvent {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
}

const EVENT_NAMES: readonly unknown[] = Object.values(Events);

class EventManager extends Manager<DiscordJSEvent> {
  override isType(value: unknown): value is DiscordJSEvent {
    if (typeof value !== "object" || !value) return false;
    return (
      "name" in value &&
      this.isEvent(value.name) &&
      "execute" in value &&
      typeof value.execute === "function"
    );
  }
  isEvent(name: unknown): name is Events {
    return EVENT_NAMES.includes(name);
  }
  override async loadPath(path: string): Promise<void> {
    if (!path) return;
    const events: DiscordJSEvent[] = (await this._FromPath(path)).filter(
      (mod): mod is DiscordJSEvent => this.isType(mod),
    );
    events.forEach((event) => {
      this.loadItem(event.name, event);
    });
  }

  deploy(client: Client): void {
    for (const event of this.values) {
      const handler = async (...args: unknown[]) => {
        try {
          await event.execute(...args);
        } catch (eventErr: unknown) {
          const reason =
            eventErr instanceof Error ? eventErr.message : eventErr;
          console.error(`Event ${event.name} - ${reason}`);
        }
      };

      if (event.once) client.once(event.name, handler);
      else client.on(event.name, handler);
    }
  }
}

export {
  Manager,
  CommandManager,
  EventManager,
  DiscordJSEvent,
  DiscordJSCommand,
};
