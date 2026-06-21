import { configureZaby, Zaby } from "../src";

configureZaby({
  environment: "local",
});

const zaby = new Zaby({
  apiKey: process.env.ZABY_API_KEY!,
});

const token = await zaby.runtimeTokens.create({
  externalAppId: process.env.ZABY_EXTERNAL_APP_ID!,
  deploymentId: process.env.ZABY_AGENT_DEPLOYMENT_ID!,
  externalUserId: "example-user",
  externalSessionId: "example-session",
  ttlSeconds: 600,
  maxUses: 20,
});

console.log(token);
