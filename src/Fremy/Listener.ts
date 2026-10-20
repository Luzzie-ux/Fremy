import { Collection, Client } from "discord.js";
import { ImportPath } from "./utils.ts";

interface DiscordEvent {
  name: string;
  once: boolean;
  execute: (x: any) => any;
}

class BaseListener {
  _events: Collection<string, DiscordEvent> = new Collection();
  constructor() {}
  isDiscordEvent(e: unknown): e is DiscordEvent {
    return typeof e === "object" && e !== null && "name" in e && "execute" in e;
  }

  loadEvent(name: string, event: DiscordEvent) {
    if (!name || !event || name !== event.name) return;
    if (this.has(name)) {
      console.log(`Event ${name} already exists, keeping oldest`);
      return;
    }
    this.set(name, event);
  }

  loadEventList(list: Record<string, DiscordEvent>) {
    Object.entries(list).forEach((entry) => {
      const [key, value] = entry;
      this.loadEvent(key, value);
    });
  }
  async loadEventPath(path: string): Promise<void> {
    if (!path) return;
    try {
      const imports = await ImportPath(path);
      if (!imports) throw new Error("Error when importing events");
      const events: DiscordEvent[] = imports.flatMap((mod) =>
        Object.getOwnPropertyNames(mod)
          .map((name) => mod[name])
          .filter((exp): exp is DiscordEvent => this.isDiscordEvent(exp)),
      );
      events.forEach((event) => this.loadEvent(event.name, event));
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.log(err.message);
      }
      throw err;
    }
  }

  dispatch(client: Client): void {
    this.events.forEach((event) => {
      if (event.once) {
        client.once(event.name, ([...args]) => event.execute([...args]));
      } else {
        client.on(event.name, ([...args]) => event.execute([...args]));
      }
    });
  }

  get events() {
    return this._events;
  }
  get keys() {
    return [...this.events.keys()];
  }
  get values() {
    return [...this.events.values()];
  }
  get(key: string) {
    return this.events.get(key);
  }
  set(key: string, value: DiscordEvent) {
    if (!key || !value) return;
    this.events.set(key, value);
  }
  has(key: string) {
    return this.events.has(key);
  }
}

export type { DiscordEvent };
export { BaseListener };
