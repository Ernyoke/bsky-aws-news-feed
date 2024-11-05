import {Handler} from 'aws-lambda';
import Bot from "./lib/bot.js";
import DynamoClient from './lib/dynamoDB.js';
import _ from 'lodash';
import {Article} from './lib/article.js';
import {Logger} from '@aws-lambda-powertools/logger';
import fetchRss from './lib/rssFeed.js';
import {getObjectFromResources} from "./lib/s3.js";
import moment from 'moment';

const logger = new Logger();
const db = new DynamoClient(logger);

async function main() {
    const articlesToPost: Article[] = [];

    const feed = await fetchRss();

    const oneDayAgo = moment().subtract(1, 'days');

    const checkIfExistsInDB = await Promise.allSettled(feed.articles.map(article => db.checkIfArticleExists(article)));
    const checkFailures: { article: Article, error: any | undefined }[] = [];

    const recentlyPublished: Article[] = [];

    for (const [article, checkResult] of _.zip(feed.articles, checkIfExistsInDB)) {
        if (!article) {
            continue;
        }

        if (checkResult?.status === "rejected") {
            checkFailures.push({
                article: article, error: checkResult?.reason
            });
            continue;
        }

        if (!checkResult?.value && moment(article.isoDate).isAfter(oneDayAgo)) {
            recentlyPublished.push(article);
        }

        if (article.guid == 'f55f6b4a5dc02d42ba3ed21498df3e0f70ad7dae') {
            recentlyPublished.push(article);
        }
    }

    for (const failure of checkFailures) {
        logger.warn(`Failed to detect if article ${failure.article.guid} with title ${failure.article.title} exists in the database!`);
    }

    Array.prototype.push.apply(articlesToPost, recentlyPublished);

    if (articlesToPost.length > 0) {
        const bot = new Bot(logger);
        await bot.login();
        const coverImageArrayBuffer = await getObjectFromResources('cover.png');

        const coverImage = coverImageArrayBuffer ? await bot.uploadImage(coverImageArrayBuffer) : null;

        for (const article of articlesToPost) {
            try {
                logger.info(`posting ${article.link}`);
                await bot.post(article, coverImage)
                logger.info(`Posted article ${article.guid} with title "${article.title} (${article.link})"`);
            } catch (ex) {
                logger.error(`Failed to post article ${article.guid} with title "${article.title} (${article.link})`, {
                    error: ex
                });
            }
        }

        await db.saveArticles(articlesToPost);
        logger.info(`${articlesToPost.length} articles were saved into DynamoDB.`);
    } else {
        logger.info(`No new articles.`);
    }
}

export const handler: Handler = async (event, context) => {
    logger.addContext(context);
    return await main();
};

// await main();
