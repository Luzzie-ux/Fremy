import { readAllFiles } from "./Fremy/utils.ts";
import { BaseWrapper } from "./Fremy/Wrapper.js";
import { BaseHandler } from "./Fremy/Handler.js";
import { Command } from "./Fremy/Handler.js";

async function Init(bot: BaseWrapper, path: string) {
  try {
    bot.create();
    await bot.load(path);
    await bot.register();
    await bot.start();
  } catch (err: unknown) {
    console.log(err);
    throw err;
  }
}

export { readAllFiles };
export { BaseWrapper as Fremy };
export { BaseHandler as Manager };
export type { Command };
export { Init };
