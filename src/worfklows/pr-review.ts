import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { Octokit } from "@octokit/rest";

export interface PRContext {
	owner: string;
	repo: string;
	prNumber: number;
}

export async function prReviewWorkflow(ctx: PRContext) {
	"use workflow";

	const diff = await fetchPRDiff(ctx);
	const review = await generateReview(diff);
	await postReviewComment(ctx, review);

	return { review };
}

async function fetchPRDiff(ctx: PRContext) {
	"use step";

	const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

	const { data } = await octokit.pulls.get({
		owner: ctx.owner,
		repo: ctx.repo,
		pull_number: ctx.prNumber,
		mediaType: { format: "diff" },
	});

	return data as unknown as string;
}

async function generateReview(diff: string) {
	"use step";

	const { text } = await generateText({
		model: google("gemini-2.0-flash"),
		system: `You are an expert code reviewer. Analyze the provided PR diff and give a concise, actionable review.
Focus on:
- Bugs or logic errors
- Security issues
- Performance concerns
- Code style and readability
- Missing edge cases

Be direct and constructive. Format your response in markdown.`,
		prompt: `Review the following PR diff:\n\n\`\`\`diff\n${diff}\n\`\`\``,
	});

	return text;
}

async function postReviewComment(ctx: PRContext, review: string) {
	"use step";

	const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

	await octokit.issues.createComment({
		owner: ctx.owner,
		repo: ctx.repo,
		issue_number: ctx.prNumber,
		body: `## AI PR Review\n\n${review}`,
	});
}
