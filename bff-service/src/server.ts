import { config } from "./config";
import { createBffServer } from "./app";

const server = createBffServer({
  recipients: config.recipients,
  cacheTtlMs: config.cacheTtlMs,
});

server.listen(config.port, () => {
  console.log(`BFF service listening on port ${config.port}`);
});
