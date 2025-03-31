import puppeteer from 'puppeteer-core';
import type { Page } from 'puppeteer-core';
import { existsSync, writeFileSync, appendFileSync, unlinkSync, readFileSync } from 'node:fs';

// Load environment variables
const config = {
	browser: {
		executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		headless: process.env.BROWSER_HEADLESS === 'true',
		viewport: {
			width: Number.parseInt(process.env.VIEWPORT_WIDTH || '1280', 10),
			height: Number.parseInt(process.env.VIEWPORT_HEIGHT || '800', 10)
		},
		userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
	},
	scraping: {
		baseUrl: process.env.BASE_URL || 'https://www.reef2reef.com/search/5928544/',
		targetUser: process.env.TARGET_USER || 'Silent'
	}
};

type Checkpoint = {
	olderThan: string | null;
	isFirstPost: boolean;
	postCounter: number;
}

type Post = {
	title: string | undefined;
	content: string | undefined;
	url: string | undefined;
	author: string | undefined;
	postNumber: string | undefined;
	date: string | undefined;
	forum: string | undefined;
}

const loadCheckpoint = (): Checkpoint => {
	if (!existsSync("scraping_checkpoint.json")) {
		writeFileSync("scraped_posts.json", "[\n");
		return {
			olderThan: null,
			isFirstPost: true,
			postCounter: 0
		};
	}

	const checkpoint = JSON.parse(readFileSync("scraping_checkpoint.json", 'utf-8'));
	console.log(`Resuming from checkpoint with posts older than ${checkpoint.olderThan}`);
	return checkpoint;
};

const getBrowserConfig = () => ({
	executablePath: config.browser.executablePath,
	headless: config.browser.headless,
});

const getPageConfig = () => ({
	viewport: config.browser.viewport,
	userAgent: config.browser.userAgent
});

const getSearchUrl = (olderThan: string | null): string => {
	const baseUrl = `${config.scraping.baseUrl}?q=%2A&c[users]=${config.scraping.targetUser}&o=date`;
	return olderThan ? `${baseUrl}&c[older_than]=${olderThan}` : baseUrl;
};

const waitForContent = async (page: Page) => {
	await page.waitForFunction(() => !document.querySelector('div#challenge-running'), { timeout: 30000 });
	await page.waitForSelector('.block-row', { timeout: 30000 });
};

const extractPostData = async (page: Page): Promise<Post[]> => {
	return page.evaluate(() => {
		const postElements = document.querySelectorAll('.block-row');
		return Array.from(postElements).map(post => {
			const dateAttr = post.querySelector('time')?.getAttribute('datetime') || undefined;
			return {
				title: post.querySelector('.contentRow-title')?.textContent?.trim(),
				content: post.querySelector('.contentRow-snippet')?.textContent?.trim(),
				url: `https://www.reef2reef.com${post.querySelector('.contentRow-title a')?.getAttribute('href')}`,
				author: post.querySelector('.username')?.textContent?.trim(),
				postNumber: post.querySelector('.contentRow-minor li:nth-child(2)')?.textContent?.trim(),
				date: dateAttr,
				forum: post.querySelector('.contentRow-minor a:last-child')?.textContent?.trim(),
			};
		});
	});
};

const saveCheckpoint = (checkpoint: Checkpoint) => {
	writeFileSync("scraping_checkpoint.json", JSON.stringify(checkpoint));
};

const writePost = (post: Post, isFirstPost: boolean) => {
	appendFileSync(
		"scraped_posts.json",
		`${isFirstPost ? "" : ",\n"}  ${JSON.stringify(post, null, 2).replace(/\n/g, "\n  ")}`
	);
};

const cleanup = (postCounter: number) => {
	appendFileSync("scraped_posts.json", "\n]");
	unlinkSync("scraping_checkpoint.json");
	console.log(`Scraping complete. Found ${postCounter} posts.`);
	console.log("Results written to scraped_posts.json");
};

const handleError = (error: unknown) => {
	console.error("Error during scraping:", error);
	console.log("Progress saved in checkpoint file. Run script again to resume.");
	process.exit(1);
};

async function scrapeAllPages() {
	const { olderThan: initialOlderThan, isFirstPost: initialIsFirstPost, postCounter: initialPostCounter } = loadCheckpoint();
	const state = { olderThan: initialOlderThan, isFirstPost: initialIsFirstPost, postCounter: initialPostCounter };

	try {
		const browser = await puppeteer.launch(getBrowserConfig());
		const page = await browser.newPage();
		
		const { viewport, userAgent } = getPageConfig();
		await page.setViewport(viewport);
		await page.setUserAgent(userAgent);

		let hasMorePages = true;
		while (hasMorePages) {
			console.log(`Scraping posts older than ${state.olderThan}...`);
			const url = getSearchUrl(state.olderThan);
			console.log(`Navigating to URL: ${url}`);
			
			await page.goto(url, { waitUntil: 'networkidle0' });
			console.log(`Landed on URL: ${page.url()}`);
			
			await waitForContent(page);
			const posts = await extractPostData(page);

			if (!posts.length) {
				hasMorePages = false;
				continue;
			}

			const oldestPost = posts[posts.length - 1];
			if (oldestPost.date) {
				state.olderThan = Math.floor(new Date(oldestPost.date).getTime() / 1000).toString();
				console.log(oldestPost.date, state.olderThan);
			}

			for (const post of posts) {
				state.postCounter++;
				console.log(`Processing post ${state.postCounter}...`);
				writePost(post, state.isFirstPost);
				state.isFirstPost = false;
			}

			saveCheckpoint(state);
		}

		await browser.close();
		cleanup(state.postCounter);
	} catch (error) {
		handleError(error);
	}
}

scrapeAllPages();
