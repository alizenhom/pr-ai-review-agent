export async function prReviewWorkflow(pr: string) {
	"use workflow";

	const review = await reviewPR(pr);

	return { review };
}

async function reviewPR(pr: string) {
	"use step";

	return `Reviewing PR: ${pr}`;
}
