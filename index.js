import BaseWrapper from "./dist/Wrapper.js";
import configs from "./.config.json" with { type: "json" };
try {
  const base = new BaseWrapper(configs);
  await base.handler.loadPath("./dist/commands");
  console.log(base.commands.size);
} catch (err) {
  console.log(err);
}
