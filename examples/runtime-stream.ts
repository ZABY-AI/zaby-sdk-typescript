import { configureZaby } from "../src";
import { ZabyRuntime } from "../src/runtime";

configureZaby({
  environment: "local",
});

const runtime = new ZabyRuntime({
  token: process.env.ZABY_RUNTIME_TOKEN!,
});

const run = await runtime.runs.start({
  input: { message: "Hello from the Zaby TypeScript SDK" },
});

for await (const event of runtime.runs.stream(String((run as { runId: string }).runId))) {
  console.log(event);
}
