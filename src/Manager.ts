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
import { globSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

interface DiscordJSCommand {
  data: SlashCommandBuilder | ContextMenuCommandBuilder;
  execute: (i: Interaction) => Promise<void>;
}

interface DiscordJSEvent {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
}

const EVENT_NAMES: readonly unknown[] = Object.values(Events);

export function isSlash(data: unknown): data is SlashCommandBuilder {
  return (
    typeof data === "object" &&
    data !== null &&
    data.constructor.name === "SlashCommandBuilder"
  );
}

export function isContext(data: unknown): data is ContextMenuCommandBuilder {
  return (
    typeof data === "object" &&
    data !== null &&
    data.constructor.name === "ContextMenuCommandBuilder"
  );
}

export function isEvent(name: unknown): name is Events {
  return EVENT_NAMES.includes(name);
}

abstract class Manager<T> {
  collection: Collection<string, T> = new Collection();

  abstract isType(value: unknown): value is T;
  abstract loadPath(path: string): Promise<void>;

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
    for (const [key, value] of Object.entries(list)) {
      this.loadItem(key, value);
    }
  }

  async __load__(dir: string, isValid: (v: unknown) => v is T): Promise<T[]> {
    console.log(`--- Loading files from ${dir} ---`);
    const items: T[] = [];
    for (const file of globSync("**/*.{js,ts}", {
      cwd: dir,
      exclude: ["**/*.d.ts", "**/*.test.*"],
    })) {
      const root = resolve(dir, file);
      const url = pathToFileURL(root).href;
      const mod: Record<string, unknown> = await import(url);
      for (const value of Object.values(mod)) {
        if (isValid(value)) items.push(value);
        else console.warn(`Invalid export in ${url}: ${typeof value}`);
      }
    }
    return items;
  }

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

class CommandManager extends Manager<DiscordJSCommand> {
  override isType(value: unknown): value is DiscordJSCommand {
    if (typeof value !== "object" || !value) return false;
    return (
      "data" in value &&
      (isSlash(value.data) || isContext(value.data)) &&
      "execute" in value &&
      typeof value.execute === "function"
    );
  }

  override async loadPath(path: string): Promise<void> {
    if (!path) return;
    [...(await this.__load__(path, this.isType))].map((cmd) =>
      this.loadItem(cmd.data.name, cmd),
    );
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
    } catch (registerErr: unknown) {
      const reason =
        registerErr instanceof Error ? registerErr.message : registerErr;
      console.error(`Error while registring commands`, reason);
      throw registerErr;
    }
  }

  async dispatch(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;
    const command = this.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (dispatchErr: unknown) {
      const reason =
        dispatchErr instanceof Error ? dispatchErr.message : dispatchErr;
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

class EventManager extends Manager<DiscordJSEvent> {
  override isType(value: unknown): value is DiscordJSEvent {
    if (typeof value !== "object" || !value) return false;
    return (
      "name" in value &&
      isEvent(value.name) &&
      "execute" in value &&
      typeof value.execute === "function"
    );
  }

  override async loadPath(path: string): Promise<void> {
    if (!path) return;
    const events = await this.__load__(path, this.isType);
    for (const event of events) {
      this.loadItem(event.name, event);
    }
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
