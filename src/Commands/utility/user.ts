import { GuildMember, Interaction, SlashCommandBuilder } from "discord.js";

const user = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("Replies with User Information"),
  execute: async (interaction: Interaction) => {
    let msg: string = "";
    if (!interaction.isChatInputCommand()) return;
    msg += `User ${interaction.user.username}`;
    if (!(interaction.member instanceof GuildMember)) {
      await interaction.reply(msg);
      return;
    }
    msg += `- Joined at: ${interaction.member.joinedAt}`;
    await interaction.reply(msg);
  },
};

export { user };
