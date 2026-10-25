export default {
  config: {
    name: "help",
    cooldown: 3,
    description: "Tampilkan command yang bisa digunakan sesuai role.",
    role: 0,
    usage: "/help"
  },
  async run(context) {
    const available = context.commands.filter((command) => command.config.role <= context.role);
    const lines = available.map((command) => {
      const cooldown = context.role > 0 ? "tanpa cooldown" : `${command.config.cooldown} dtk`;
      return `/${command.config.name} — ${command.config.description} (${cooldown})`;
    });
    return `Daftar command Esdeath\n${lines.join("\n")}`;
  }
};
