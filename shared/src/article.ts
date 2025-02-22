export class Article {
    constructor(public guid: string,
                public creator: string,
                public title: string,
                public link: string,
                public pubDate: string,
                public author: string,
                public contentSnippet: string,
                public categories: string[],
                public isoDate: string
    ) {
    }
}

export class ArticleBuilder {
    private guid!: string;
    private creator!: string;
    private title!: string;
    private link!: string;
    private pubDate!: string;
    private author!: string;
    private contentSnippet!: string;
    private categories: string[] = [];
    private isoDate!: string;

    setGuid(guid: string): this {
        this.guid = guid;
        return this;
    }

    setCreator(creator: string): this {
        this.creator = creator;
        return this;
    }

    setTitle(title: string): this {
        this.title = title;
        return this;
    }

    setLink(link: string): this {
        this.link = link;
        return this;
    }

    setPubDate(pubDate: string): this {
        this.pubDate = pubDate;
        return this;
    }

    setAuthor(author: string): this {
        this.author = author;
        return this;
    }

    setContentSnippet(contentSnippet: string): this {
        this.contentSnippet = contentSnippet;
        return this;
    }

    setCategories(categories: string[]): this {
        this.categories = categories;
        return this;
    }

    setIsoDate(isoDate: string): this {
        this.isoDate = isoDate;
        return this;
    }

    build(): Article {
        return new Article(
            this.guid,
            this.creator,
            this.title,
            this.link,
            this.pubDate,
            this.author,
            this.contentSnippet,
            this.categories,
            this.isoDate
        );
    }
}