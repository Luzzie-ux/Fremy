import { Interaction, SlashCommandBuilder } from "discord.js";

const reload = {
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription(
      "supposed to reload the commands of client without killing it",
    ),
  execute: async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.isRepliable()) {
      interaction.reply("Command still to be made");
    }
    console.log(interaction);
  },
};

export default reload;
