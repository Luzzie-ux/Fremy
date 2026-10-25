import { SlashCommandBuilder, Interaction } from "discord.js";

const kill = {
  data: new SlashCommandBuilder()
    .setName("kill")
    .setDescription("kills the client"),
  execute: async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.isRepliable())
      await interaction.reply({
        content: `${interaction.client.user.tag} is going offline :c`,
      });
    console.warn("Killing process now");
    interaction.client.destroy();
  },
};

export { kill };
