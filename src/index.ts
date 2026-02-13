import type { PullRequestEvent } from "@octokit/webhooks-types";

import { Hono } from "hono";
import { start } from "workflow/api";
import { prReviewWorkflow } from "./worfklows/pr-review.js";

const app = new Hono();

app.get("/", (c) => {
	return c.json({ message: "PR Review Agent is running." });
});

app.post("/webhook", async (c) => {
	const event = c.req.header("x-github-event");
	console.log("event", event);

	if (event !== "pull_request") {
		return c.json({ message: "Ignored" }, 200);
	}

	const payload = await c.req.json<PullRequestEvent>();

	const { repository, number, sender, action } = payload;

	if (!["opened", "synchronize", "reopened"].includes(action)) {
		return c.json({ message: "Ignored" }, 200);
	}

	await start(prReviewWorkflow, [
		{
			repo: repository.name,
			owner: sender.login,
			prNumber: number,
		},
	]);

	return c.json({ message: "PR review started" });
});

export default app;
