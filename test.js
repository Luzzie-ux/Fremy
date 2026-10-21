import { Fremy } from "./dist/Fremy.js";
import configs from "./.config.json" with { type: "json" };

try {
  const FremyBot = new Fremy(configs);
  FremyBot.createClient();
  await FremyBot.loadCmds("./dist/Commands");
  await FremyBot.registerCmds();
  await FremyBot.loadDefaults();
  await FremyBot.startClient();
} catch (err) {
  console.log(err);
}
