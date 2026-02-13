import { createGroq } from "@ai-sdk/groq";
import { Octokit } from "@octokit/rest";
import { generateText } from "ai";

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

const IGNORED_FILES =
	/\.(lock|snap|min\.js|min\.css|map)$|^(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|.*\.generated\.)/;
const MAX_DIFF_CHARS = 20_000;

async function fetchPRDiff(ctx: PRContext) {
	"use step";

	const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

	const { data: files } = await octokit.pulls.listFiles({
		owner: ctx.owner,
		repo: ctx.repo,
		pull_number: ctx.prNumber,
		per_page: 100,
	});

	const relevantFiles = files.filter((f) => !IGNORED_FILES.test(f.filename));

	let diff = relevantFiles
		.map((f) => `diff --git a/${f.filename} b/${f.filename}\n${f.patch ?? ""}`)
		.join("\n");

	if (diff.length > MAX_DIFF_CHARS) {
		diff = diff.slice(0, MAX_DIFF_CHARS) + "\n\n[diff truncated]";
	}

	return diff;
}

async function generateReview(diff: string) {
	"use step";

	const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
	const { text } = await generateText({
		model: groq("llama-3.3-70b-versatile"),
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
