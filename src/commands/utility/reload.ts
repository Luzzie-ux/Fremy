import { Interaction, SlashCommandBuilder } from "discord.js";

const reload = {
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription(
      "supposed to reload the commands of client without killing it",
    ),
  execute: async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
    console.log(interaction);
  },
};

export default reload;
