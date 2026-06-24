import { configureZaby, LOCAL_ZABY_API_ORIGIN, Zaby } from "../src";

const apiOrigin = process.env.ZABY_API_ORIGIN ?? LOCAL_ZABY_API_ORIGIN;

configureZaby({ apiOrigin });

const apiKey = process.env.ZABY_API_KEY ?? "zaby_pk_smoke_placeholder";
const zaby = new Zaby({ apiKey });

console.log(`Zaby SDK smoke using ${apiOrigin}`);

const health = await zaby.health.check() as { status?: string };
if (health.status !== "ok") {
  throw new Error(`Expected health status ok, received ${JSON.stringify(health)}`);
}
console.log("health ok");

if (!process.env.ZABY_API_KEY) {
  console.log("ZABY_API_KEY not set; skipping authenticated provisioning smoke.");
  process.exit(0);
}

const externalApps = await zaby.externalApps.list({ status: "ACTIVE" });
console.log("authenticated provisioning smoke ok");
console.log(JSON.stringify(externalApps, null, 2));
