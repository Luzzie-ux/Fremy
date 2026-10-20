import { CommandManager, EventManager } from "./dist/Fremy/Manager.js";

try {
  const cmd = new CommandManager();
  const evt = new EventManager();
} catch (err) {
  console.log(err);
}
