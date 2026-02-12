import { Hono } from "hono";
import { start } from "workflow/api";
import { prReviewWorkflow } from "./worfklows/pr-review";

const app = new Hono();

app.get("/", (c) => {
	return c.text("PR Review Agent is running.");
});

app.post("/webhook", async (c) => {
	const event = c.req.header("x-github-event");

	if (event !== "pull_request") {
		return c.json({ message: "Ignored" }, 200);
	}

	const payload = await c.req.json<{
		action: string;
		pull_request: { number: number };
		repository: { name: string; owner: { login: string } };
	}>();

	const { action, pull_request, repository } = payload;

	if (!["opened", "synchronize", "reopened"].includes(action)) {
		return c.json({ message: "Ignored" }, 200);
	}

	await start(prReviewWorkflow, [
		{
			owner: repository.owner.login,
			repo: repository.name,
			prNumber: pull_request.number,
		},
	]);

	return c.json({ message: "PR review started" });
});

export default app;
