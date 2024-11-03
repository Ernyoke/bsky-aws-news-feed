import { bskyAccount, bskyService, bskyDryRun } from "./config.js";
import type {
    AtpAgentLoginOpts,
    AtpAgentOpts,
    AppBskyFeedPost,
    AppBskyRichtextFacet
} from "@atproto/api";
import atproto from "@atproto/api";
import { Article } from "./article.js";
import { Logger } from "@aws-lambda-powertools/logger";
import moment from "moment";
const { BskyAgent } = atproto;

type BotOptions = {
    service: string | URL;
    dryRun: boolean;
};

const defaultOptions: BotOptions = {
    service: bskyService,
    dryRun: bskyDryRun,
}

export default class Bot {
    #agent;

    constructor(private logger: Logger, options: BotOptions = defaultOptions) {
        const { service } = options;
        this.#agent = new BskyAgent({ service });
    }

    login(loginOpts: AtpAgentLoginOpts = bskyAccount) {
        return this.#agent.login(loginOpts);
    }

    async post(article: Article, coverImage:atproto.ComAtprotoRepoUploadBlob.OutputSchema | undefined | null, dryRun: boolean = defaultOptions.dryRun) {
        if (dryRun) {
            this.logger.info("Article not posted! Reason: dry run.")
            return;
        }

        let offset = article.title.length + 1;

        const tagsFacets: AppBskyRichtextFacet.Main[] = [];
        let textLineWithTags = '';
        const bskyTags = convertToBskyTags(article.categories);
        for (const tag of bskyTags) {
            const hashTag = `#${tag}`;
            tagsFacets.push(
                {
                    index: {
                        byteStart: offset,
                        byteEnd: offset + hashTag.length
                    },
                    features: [{
                        $type: 'app.bsky.richtext.facet#tag',
                        tag: tag
                    }]
                }
            );
            offset += (hashTag.length + 1); // for colon and space after tag
            textLineWithTags += `${hashTag} `;
        }

        const fullText = `${article.title}\n${textLineWithTags}`;

        const record = {
            '$type': 'app.bsky.feed.post',
            createdAt: moment().toISOString(), // Post with the current moment, otherwise it will fuck up the feed
            text: fullText,
            facets: tagsFacets,
            embed: {
                "$type": 'app.bsky.embed.external',
                external: {
                    uri: article.link,
                    title: article.title,
                    description: article.contentSnippet,
                    thumb: coverImage?.blob
                }
            }
        } as AppBskyFeedPost.Record;

        return await this.#agent.post(record);
    }

    async uploadImage(imageBuffer: Uint8Array) {
        const response = await this.#agent.uploadBlob(imageBuffer, { encoding: `image/png` });
        return response.data
    }
}

function convertToBskyTags(tags: string[]): string[] {
    return tags.filter(tag => tag.startsWith('general:products/'))
        .map(tag => tag.replace('general:products/', ''))
        .map(tag => tag.split('-'))
        .map(parts => parts.map(capitalize))
        .map(parts => parts.join(''));
}

function capitalize(str: string) {
    return String(str[0]).toUpperCase() + String(str).slice(1)
}
