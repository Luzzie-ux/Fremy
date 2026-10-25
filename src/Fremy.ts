import { Client, Events, GatewayIntentBits, Interaction } from "discord.js";
import {
  Manager,
  CommandManager,
  EventManager,
  DiscordJSEvent,
  DiscordJSCommand,
  isSlash,
  isContext,
  isEvent,
} from "./Manager.js";

import { join } from "node:path";

const DEFAULT_COMMANDS_PATH = join(import.meta.dirname, "Commands");
const DEFAULT_EVENTS_PATH = join(import.meta.dirname, "Events");

type Intent =
  GatewayIntentBits | IntentName | Array<GatewayIntentBits | IntentName>;
type IntentName = keyof typeof GatewayIntentBits;
type RequiredConfig = Pick<
  JSONConfig,
  "token" | "intents" | "clientId" | "guildId"
>;

interface JSONConfig {
  token: string;
  intents?: string[];
  clientId?: string;
  guildId?: string;
  [key: string]: unknown;
}

class Wrapper {
  #token: string;
  #intents: Array<GatewayIntentBits>;
  #clientId: string;
  #guildId: string;
  #extras: Record<string, unknown>;
  #client?: Client;
  #events: EventManager;
  #commands: CommandManager;

  constructor(configs: JSONConfig) {
    console.log("--- Fremy the Framework ---");
    const { token, intents, clientId, guildId, ...rest } = configs;
    const valid = validate({ token, intents, clientId, guildId });
    this.#token = valid.token;
    this.#intents = valid.intents;
    this.#clientId = valid.clientId;
    this.#guildId = valid.guildId;
    this.#extras = rest;
    this.#events = new EventManager();
    this.#commands = new CommandManager();
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env, prefix?: string) {
    if (!prefix || prefix.trim() === "") prefix = "DISCORD_";
    return new Wrapper(toJSON(env, prefix));
  }

  addExtra(key: string, value: unknown): void {
    if (key === "") {
      console.warn("Key shouldn't be an empty string");
      return;
    }
    this.extras[key] = value;
  }

  addIntents(intents: Intent): void {
    if (!intents) return;
    if (!Array.isArray(intents)) intents = [intents];
    for (const value of intents) {
      if (!value) throw new Error(`Invalid Intent`);
      if (typeof value === "string") this.intents.push(toIntent(value));
      else this.intents.push(value);
    }
  }

  createClient(): Client {
    this.#client = new Client({ intents: this.intents });
    return this.#client;
  }

  async startClient(load_defaults: boolean = true): Promise<void> {
    console.log("\n--- Starting Client Session ---");
    if (!this.client) {
      console.warn("|-- Unable to reach client: no instance found");
      return;
    }
    try {
      if (load_defaults) {
        await this.loadCmds(DEFAULT_COMMANDS_PATH);
        await this.loadEvents(DEFAULT_EVENTS_PATH);
        await this.loadEvents({
          dispatch: {
            name: Events.InteractionCreate,
            execute: (...[interaction]: unknown[]) => {
              const int = interaction as Interaction;
              this.dispatchCmds(int).catch((err) => {
                console.error("Unhandled error: ", err);
              });
            },
          },
        });
      }
      await this.registerCmds();
      this.deployEvents(this.client);
      await this.client.login(this.#token);
    } catch (startErr: unknown) {
      const reason = startErr instanceof Error ? startErr.message : startErr;
      console.error(reason);
      throw startErr;
    }
  }

  async stopClient(): Promise<void> {
    try {
      if (!this.client) {
        console.warn("Unable to reach client: no instance found");
        return;
      }
      await this.client.destroy();
    } catch (stopErr: unknown) {
      const reason = stopErr instanceof Error ? stopErr.message : stopErr;
      console.error(reason);
      throw stopErr;
    }
  }
  async loadCmds(path: string): Promise<void>;
  async loadCmds(list: Record<string, DiscordJSCommand>): Promise<void>;
  async loadCmds(commands: string | Record<string, DiscordJSCommand>) {
    if (!commands) return;
    if (typeof commands === "string") {
      await this.commands.loadPath(commands);
    } else {
      this.commands.loadList(commands);
    }
  }

  async registerCmds() {
    await this.commands.register({
      token: this.#token,
      clientId: this.clientId,
      guildId: this.guildId,
    });
  }

  async dispatchCmds(interaction: Interaction) {
    await this.commands.dispatch(interaction);
  }

  async loadEvents(path: string): Promise<void>;
  async loadEvents(list: Record<string, DiscordJSEvent>): Promise<void>;
  async loadEvents(events: string | Record<string, DiscordJSEvent>) {
    if (!events) return;
    if (typeof events === "string") {
      await this.events.loadPath(events);
    } else {
      this.events.loadList(events);
    }
  }

  deployEvents(client: Client) {
    this.events.deploy(client);
  }

  // Getters and Setters:
  set clientId(clientId: string) {
    if (!clientId) {
      this.#clientId = "";
      return;
    }
    this.#clientId = clientId;
  }

  set guildId(guildId: string) {
    if (!guildId) {
      this.#guildId = "";
      return;
    }
    this.#guildId = guildId;
  }

  set extras(extras: Record<string, unknown>) {
    this.#extras = extras;
  }

  get intents() {
    return this.#intents;
  }
  get clientId() {
    return this.#clientId;
  }
  get guildId() {
    return this.#guildId;
  }
  get extras() {
    return this.#extras;
  }
  get client() {
    if (!this.#client) return undefined;
    return this.#client;
  }
  get commands() {
    return this.#commands;
  }
  get events() {
    return this.#events;
  }
}

function validate(config: RequiredConfig) {
  if (!config.token) {
    throw new Error("Token is undefined");
  }
  return {
    token: config.token.trim(),
    intents: (config.intents ?? ["Guilds"]).map(toIntent),
    clientId: config.clientId ?? "",
    guildId: config.guildId ?? "",
  };
}

function toIntent(name: string) {
  if (!(name in GatewayIntentBits) || !isNaN(Number(name)))
    throw new Error(`Invalid Intent: ${name}`);
  return GatewayIntentBits[name as IntentName];
}

function camelCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function toJSON(env: NodeJS.ProcessEnv, prefix: string): JSONConfig {
  const config = new Map<string, string>();
  let msg: string = "";
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith(prefix)) {
      if (value === "undefined" || value === undefined) {
        msg += `${key} has Undefined Value\n`;
        continue;
      } else {
        config.set(camelCase(key.slice(prefix.length)), value);
      }
    }
  }
  if (msg.length) throw new Error(msg);

  const { token, intents, clientId, guildId, ...rest } =
    Object.fromEntries(config);
  return {
    token: token ?? "",
    intents: intents
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    clientId: clientId ?? "",
    guildId: guildId ?? "",
    ...rest,
  };
}

export { Wrapper as Fremy };
export {
  Manager,
  EventManager,
  CommandManager,
  DiscordJSEvent,
  DiscordJSCommand,
  isSlash,
  isContext,
  isEvent,
};
