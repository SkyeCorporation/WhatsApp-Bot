export default {
  config: {
    name: "ping",
    cooldown: 3,
    description: "Cek apakah bot merespons.",
    role: 0,
    usage: "/ping"
  },
  async run() {
    return "Pong!!";
  }
};
