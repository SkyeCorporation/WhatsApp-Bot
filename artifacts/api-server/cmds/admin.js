export default {
  config: {
    name: "admin",
    cooldown: 0,
    description: "Kelola status pengguna, saldo, dan statistik bot.",
    role: 4,
    usage: "/admin stats | ban <nomor> [alasan] | unban <nomor> | addmoney <nomor> <jumlah>"
  },
  async run(context) {
    const [action, target, ...rest] = context.args;
    if (action === "stats") {
      const stats = context.store.getStats();
      return `Statistik Esdeath\nPengguna: ${stats.totalUsers}\nBanned: ${stats.bannedUsers}`;
    }

    if (action === "ban") {
      const phone = context.normalizePhone(target);
      if (!phone) return "Nomor tidak valid. Gunakan format nomor telepon internasional, misalnya 628123456789.";
      if (context.adminNumbers.includes(phone)) return "Nomor admin bot tidak bisa dibanned.";
      const reason = rest.join(" ").trim() || "None";
      const user = context.store.setBanned(phone, reason);
      return user
        ? `${phone} berhasil dibanned.\nAlasan: ${user.bannedReason}`
        : "Gagal menyimpan status banned.";
    }

    if (action === "unban") {
      const phone = context.normalizePhone(target);
      if (!phone) return "Nomor tidak valid. Gunakan format nomor telepon internasional, misalnya 628123456789.";
      const user = context.store.setUnbanned(phone);
      return user ? `${phone} berhasil di-unban.` : "Gagal menyimpan status unbanned.";
    }

    if (action === "addmoney") {
      const phone = context.normalizePhone(target);
      const amount = Number(rest[0]);
      if (!phone || !Number.isSafeInteger(amount) || amount <= 0) {
        return "Format: /admin addmoney <nomor> <jumlah positif>";
      }
      const user = context.store.addMoney(phone, amount);
      return user ? `Saldo ${phone} sekarang ${user.money}.` : "Gagal memperbarui saldo.";
    }

    return [
      "Penggunaan command admin:",
      "/admin stats",
      "/admin ban <nomor> [alasan]",
      "/admin unban <nomor>",
      "/admin addmoney <nomor> <jumlah>"
    ].join("\n");
  }
};
