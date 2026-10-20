import { Fremy, Init } from "./dist/Fremy.js";
import configs from "./.config.json" with { type: "json" };
try {
  const bot = new Fremy(configs);
  await Init(bot, "./dist/Commands");
  console.log(bot.commands.size);
} catch (err) {
  console.log(err);
}
