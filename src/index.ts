import { Hono } from "hono";
import { start } from "workflow/api";
import { prReviewWorkflow } from "./worfklows/pr-review";

const app = new Hono();
app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.post("/webhook", async (c) => {
	const { pr } = await c.req.json();
	await start(prReviewWorkflow, [pr]);
	return c.json({ message: "PR Review started" });
});
export default app;
