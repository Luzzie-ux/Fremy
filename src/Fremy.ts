import { BaseWrapper } from "./Wrapper.js";
import { BaseHandler } from "./Handler.js";
import { Command } from "./Handler.js";

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

export { BaseWrapper as Fremy };
export { BaseHandler as Manager };
export type { Command };
export { Init };
