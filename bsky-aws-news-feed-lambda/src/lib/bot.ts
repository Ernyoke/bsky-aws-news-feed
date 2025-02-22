import {bskyAccount, config} from "./config.js";
import type {AppBskyFeedPost, AppBskyRichtextFacet, AtpAgentLoginOpts} from "@atproto/api";
import atproto from "@atproto/api";
import {Logger} from "@aws-lambda-powertools/logger";
import moment from "moment";
import {Article} from "shared";

const {BskyAgent} = atproto;

type BotOptions = {
    service: string | URL;
    dryRun: boolean;
};

const defaultOptions: BotOptions = {
    service: config.bskyService,
    dryRun: config.bskyDryRun,
}

export default class Bot {
    #agent;

    constructor(private logger: Logger, options: BotOptions = defaultOptions) {
        const {service} = options;
        this.#agent = new BskyAgent({service});
    }

    login(loginOpts: AtpAgentLoginOpts = bskyAccount) {
        return this.#agent.login(loginOpts);
    }

    async post(article: Article,
               coverImage: atproto.ComAtprotoRepoUploadBlob.OutputSchema | undefined | null,
               dryRun: boolean = defaultOptions.dryRun) {

        if (dryRun) {
            this.logger.warn("Article not posted! Reason: dry run.");
            return;
        }

        const encoder = new TextEncoder();

        const titleRow = `🆕 ${article.title}\n\n`

        let offset = encoder.encode(titleRow).byteLength;

        const tagsFacets: AppBskyRichtextFacet.Main[] = [];
        let textRowWithTags = '';
        const bskyTags = ['AWS'];
        Array.prototype.push.apply(bskyTags, convertToBskyTags(article.categories));

        const hashTags: string[] = [];
        for (const tag of bskyTags) {
            const hashTag = `#${tag}`;
            const hashTagLength = encoder.encode(hashTag).byteLength;
            tagsFacets.push(
                {
                    index: {
                        byteStart: offset,
                        byteEnd: offset + hashTagLength
                    },
                    features: [{
                        $type: 'app.bsky.richtext.facet#tag',
                        tag: tag
                    }]
                }
            );
            offset += (hashTagLength + 1);
            hashTags.push(hashTag);
        }

        textRowWithTags += `${hashTags.join(' ')}`;

        const fullText = `${titleRow}${textRowWithTags}`;

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

    async uploadImage(imageBuffer: Uint8Array, dryRun: boolean = defaultOptions.dryRun) {
        if (dryRun) {
            this.logger.warn("Image not uploaded! Reason: dry run.");
            return;
        }

        const response = await this.#agent.uploadBlob(imageBuffer, {encoding: `image/png`});
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
