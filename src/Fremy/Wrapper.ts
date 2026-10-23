import { Client, Events, GatewayIntentBits, Interaction } from "discord.js";
import {
  CommandManager,
  EventManager,
  DiscordJSEvent,
  DiscordJSCommand,
} from "./Manager.js";

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
    const { token, intents, clientId, guildId, ...rest } = configs;
    const valid = validate({ token, intents, clientId, guildId });
    this.#token = valid.token;
    this.#intents = valid.intents.;
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

  loadDefaults(): void {
    const ready = {
      name: Events.ClientReady,
      once: true,
      execute(...[readyClient]: unknown[]) {
        const client: Client = readyClient as Client;
        console.log(`${client.user?.tag} is ready!`);
      },
    };
    this.events.loadItem(ready.name, ready);
  }

  createClient(): Client {
    this.#client = new Client({ intents: this.intents });
    const event = {
      name: Events.InteractionCreate,
      execute: (...[interaction]: unknown[]) => {
        const int = interaction as Interaction;
        this.dispatchCmds(int).catch((err) => {
          console.error("Unhandled error while dispatching interaction: ", err);
        });
      },
    };
    this.events.loadItem(event.name, event);
    return this.#client;
  }

  async startClient(): Promise<void> {
    try {
      if (!this.client) {
        console.warn("Unable to reach client: no instance found");
        return;
      }
      this.events.deploy(this.client);
      await this.client.login(this.#token);
    } catch (err: unknown) {
      if (err instanceof Error) console.error(err.message);
      throw err;
    }
  }

  async stopClient(): Promise<void> {
    try {
      if (!this.client) {
        console.warn("Unable to reach client: no instance found");
        return;
      }
      await this.client.destroy();
    } catch (err: unknown) {
      if (err instanceof Error) console.error(err.message);
      throw err;
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
