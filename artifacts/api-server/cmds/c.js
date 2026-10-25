export default {
  config: {
    name: "c",
    cooldown: 5,
    description: "Lihat profil dan saldo akun Anda.",
    role: 0,
    usage: "/c"
  },
  async run(context) {
    const user = context.user;
    return [
      `ID: ${user.id}`,
      `Nama: ${user.name}`,
      `Nomor: ${user.nomor}`,
      `Status: ${user.status}`,
      `Money: ${user.money}`
    ].join("\n");
  }
};
