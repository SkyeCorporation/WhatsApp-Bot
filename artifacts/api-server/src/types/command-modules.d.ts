declare module "*.js" {
  const command: import("../lib/command-types").CommandModule;
  export default command;
}
