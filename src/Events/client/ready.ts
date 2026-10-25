import { Events, Client } from "discord.js";

const ready = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    console.log(`\nClient Ready! Logged in as ${client.user?.tag}`);
  },
};

export { ready };
