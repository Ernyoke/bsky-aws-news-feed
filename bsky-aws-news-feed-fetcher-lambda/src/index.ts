import {Handler} from 'aws-lambda';
import DynamoClient from './lib/dynamoDB.js';
import _ from 'lodash';
import {Logger} from '@aws-lambda-powertools/logger';
import fetchRss from './lib/rssFeed.js';
import moment from 'moment';
import {Article} from "shared";
import QueueClient from "./lib/sqs.js";

const logger = new Logger();
const db = new DynamoClient(logger);
const sqs = new QueueClient(logger);

async function main() {
    const articlesToPost: Article[] = [];

    const feed = await fetchRss();

    const checkIfExistsInDB =
        await Promise.allSettled(feed.articles.map(article => db.checkIfArticleExists(article)));
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

        const sevenDaysAgo = moment().subtract(7, 'days');
        if (!checkResult?.value && moment(article.isoDate).isAfter(sevenDaysAgo)) {
            recentlyPublished.push(article);
        }
    }

    for (const failure of checkFailures) {
        logger.warn(`Failed to detect if article ${failure.article.guid} with title ${failure.article.title} exists in the database!`);
    }

    Array.prototype.push.apply(articlesToPost, recentlyPublished);

    if (articlesToPost.length > 0) {
        await sqs.sendArticlesWithDelay(articlesToPost);

        await db.saveArticles(articlesToPost);
        logger.info(`${articlesToPost.length} articles were saved into DynamoDB.`);
    } else {
        logger.info('No new articles found.');
    }
}

export const handler: Handler = async (event, context) => {
    logger.addContext(context);
    return await main();
};
