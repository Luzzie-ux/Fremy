/* THIS ON DEVELOPMENT!
import * as discord from "discord.js";


interface Options {
  builder: string;
  name: string;
  description: string;
  type?: string;
}

class BaseCreator {
  constructor() {}
  build(options: Options, execute: (i: discord.Interaction) => Promise<void>) {
    if (
      ["Slash", "SlashCommand", "SlashCommandBuilder"].includes(options.builder)
    ) {
      return {
        data: new discord.SlashCommandBuilder()
          .setName(options.name)
          .setDescription(options.description),
        execute,
      };
    } else if (options.builder === "ContextMenuCommandBuilder") {
      if (!options.type?.trim())
        throw new Error("Context Menu Commands need a type");
      const type = Object.keys(discord.ApplicationCommandType).indexOf(
        options.type,
      );
      return {
        data: new discord.ContextMenuCommandBuilder()
          .setName(options.name)
          .setType(type),
        execute,
      };
    } else {
      return { data: new discord.SlashCommandBuilder(), execute };
    }
  }
}

export { BaseCreator };

*/
