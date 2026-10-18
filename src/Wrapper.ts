import { Client, Events, GatewayIntentBits, Interaction } from "discord.js";
import { BaseHandler, type Command } from "./Handler.js";

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

class BaseWrapper {
  // These Properties are member properties of Wrapper
  #token: string;
  _intents: Array<GatewayIntentBits>;
  _clientId: string;
  _guildId: string;
  #extras: Record<string, unknown> = {};
  // These Class Objects, are part of discord.js
  // or another wrapper for something part of discord.js
  #client?: Client;
  #handler: BaseHandler = new BaseHandler();
  #listerner: string = "";

  constructor(configs: JSONConfig) {
    const { token, intents, clientId, guildId, ...rest } = configs;
    const valid = validate({ token, intents, clientId, guildId });
    this.#token = valid.token;
    this._intents = valid.intents;
    this._clientId = valid.clientId;
    this._guildId = valid.guildId;
    this.#extras = rest;
    void this.#listerner;
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env, prefix?: string) {
    if (!prefix) prefix = "DISCORD_";
    return new BaseWrapper(toJSON(env, prefix));
  }

  addExtra(key: string, value: unknown) {
    if (key === "") throw new Error("Key shouldn't be an empty string");
    this.extras[key] = value;
  }

  addIntents(intents: Intent) {
    if (!intents) return;
    if (!Array.isArray(intents)) intents = [intents];
    for (const value of intents) {
      if (!value) throw new Error(`Invalid Intent`);
      if (typeof value === "string") this._intents.push(toIntent(value));
      else this._intents.push(value);
    }
  }

  set clientId(clientId: string) {
    if (!clientId) {
      this._clientId = "";
      return;
    }
    this._clientId = clientId;
  }

  set guildId(guildId: string) {
    if (!guildId) {
      this._guildId = "";
      return;
    }
    this._guildId = guildId;
  }

  set extras(extras: Record<string, unknown>) {
    this.#extras = extras;
  }

  get token(): string {
    return this.#token;
  }
  get intents(): Array<GatewayIntentBits> {
    return this._intents;
  }
  get clientId(): string {
    return this._clientId;
  }
  get guildId(): string {
    return this._guildId;
  }
  get extras(): Record<string, unknown> {
    return this.#extras;
  }
  get client(): Client {
    if (!this.#client) throw new Error("Unable to reach Client");
    return this.#client;
  }

  get handler(): BaseHandler {
    return this.#handler;
  }

  create(bits?: Array<GatewayIntentBits>): Client {
    if (!bits) bits = this.intents;
    this.#client = new Client({ intents: bits });
    this.#client.once(Events.ClientReady, (readyClient) => {
      console.log(`${readyClient.user.tag} is Ready!`);
    });
    this.#client.on(Events.InteractionCreate, (i) => void this.dispatch(i));
    return this.#client;
  }

  async start(): Promise<void> {
    try {
      await this.client.login(this.token);
    } catch (err: unknown) {
      if (err instanceof Error) console.error(err.message);
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.client.destroy();
    } catch (err: unknown) {
      if (err instanceof Error) console.error(err.message);
      throw err;
    }
  }

  // Wrappers methods for the BaseHandler methods;
  async load(path: string): Promise<void>;
  async load(list: Record<string, Command>): Promise<void>;
  async load(commands: string | Record<string, Command>): Promise<void> {
    await this.handler.load(commands);
  }
  async register() {
    await this.handler.register({
      token: this.token,
      clientId: this._clientId,
      guildId: this.guildId,
    });
  }
  async dispatch(interaction: Interaction) {
    await this.handler.dispatch(interaction);
  }
  get commands() {
    return this.handler.commands;
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

export default BaseWrapper;
