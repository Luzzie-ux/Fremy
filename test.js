import { Manager } from "./dist/Fremy.js";

try {
  const cmd = new Manager.CommandManager();
  await cmd.loadPath("./dist/Commands");
  const evt = new Manager.EventManager();
  await evt.loadPath("./dist/Events/client");
  console.log(cmd.collection.size);
  console.log(evt.collection.size);
} catch (err) {
  console.log(err);
}
