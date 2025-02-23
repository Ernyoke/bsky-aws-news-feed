import {bskyAccount, config} from "./config.js";
import type {AppBskyFeedPost, AppBskyRichtextFacet, AtpAgentLoginOpts, BlobRef} from "@atproto/api";
import atproto from "@atproto/api";
import {Logger} from "@aws-lambda-powertools/logger";
import moment from "moment";
import {Article} from "shared";

const {BskyAgent} = atproto;

const MAX_GRAPHEMES = 300;

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
               summary: string | null,
               coverImageData: atproto.ComAtprotoRepoUploadBlob.OutputSchema | undefined | null,
               dryRun: boolean = defaultOptions.dryRun) {

        const content = summary ? summary : article.title;
        let record = this.buildRichTextRecord(article, content, coverImageData?.blob);
        const postLength = record.text.length;
        if (postLength > MAX_GRAPHEMES) {
            this.logger.warn(`Post length for article '${article.title}' exceeds ${MAX_GRAPHEMES} graphemes. Content is truncated.`);
            const contentTruncated = truncateText(content, Math.max(0, content.length - (postLength - MAX_GRAPHEMES)));
            record = this.buildRichTextRecord(article, contentTruncated, coverImageData?.blob);
        }

        if (dryRun) {
            this.logger.warn("Article not posted! Reason: dry run.");
            return;
        }

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

    buildRichTextRecord(article: Article, content: string, coverImage: BlobRef | undefined) {
        const encoder = new TextEncoder();

        const contentRow = `🆕 ${content}\n\n`

        let offset = encoder.encode(contentRow).byteLength;

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

        const fullText = `${contentRow}${textRowWithTags}`;

        return {
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
                    thumb: coverImage
                }
            }
        } as AppBskyFeedPost.Record;
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

function truncateText(text: string, maxGraphemes: number): string {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    const graphemes = [...segmenter.segment(text)].map(segment => segment.segment);

    if (graphemes.length > maxGraphemes) {
        return graphemes.slice(0, maxGraphemes - 1).join("") + "…"; // Adding ellipsis
    }
    return text;
}
