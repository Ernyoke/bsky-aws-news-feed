import {Context, SQSEvent, SQSHandler, SQSRecord} from 'aws-lambda';
import Bot from "./lib/bot.js";
import {Logger} from '@aws-lambda-powertools/logger';
import {getObjectFromResources} from "./lib/s3.js";
import {Article} from "shared";
import {BatchProcessor, EventType, processPartialResponse} from "@aws-lambda-powertools/batch";
import {config} from "./lib/config.js";
import {Nova} from "./lib/nova.js";

const logger = new Logger();
const nova = new Nova(logger)
const bot = new Bot(logger, nova);
const processor = new BatchProcessor(EventType.SQS);

const coverImagePromise = getObjectFromResources('cover.png');

const recordHandler = async (record: SQSRecord): Promise<void> => {
    const payload = record.body;
    const coverImageArrayBuffer = await coverImagePromise;
    const coverImage = coverImageArrayBuffer ? await bot.uploadImage(coverImageArrayBuffer) : null;
    if (payload) {
        const article = JSON.parse(payload) as Article;
        try {
            const result = await bot.post(article, coverImage, config.bskyDryRun);
            logger.info(`Posted article ${article.guid} with title "${article.title}. Post URI: ${result?.uri}"`);
        } catch (ex) {
            logger.error(`Failed to post article ${article.guid} with title "${article.title} `, {
                error: ex
            });
            throw ex;
        }
    }
};

export const handler: SQSHandler = async (event: SQSEvent, context: Context) => {
    logger.addContext(context);
    logger.info(`Received batch of ${event.Records.length} events from SQS.`);
    await bot.login();
    return await processPartialResponse(event, recordHandler, processor, {
        context,
        processInParallel: true
    });
}
