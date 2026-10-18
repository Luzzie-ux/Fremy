import { Interaction, SlashCommandBuilder } from "discord.js";

export const ping = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("ping command"),
  execute: async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await interaction.reply("Pong!");
  },
};
