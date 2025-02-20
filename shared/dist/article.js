export class Article {
    guid;
    creator;
    title;
    link;
    pubDate;
    author;
    contentSnippet;
    categories;
    isoDate;
    constructor(guid, creator, title, link, pubDate, author, contentSnippet, categories, isoDate) {
        this.guid = guid;
        this.creator = creator;
        this.title = title;
        this.link = link;
        this.pubDate = pubDate;
        this.author = author;
        this.contentSnippet = contentSnippet;
        this.categories = categories;
        this.isoDate = isoDate;
    }
}
export class ArticleBuilder {
    guid;
    creator;
    title;
    link;
    pubDate;
    author;
    contentSnippet;
    categories = [];
    isoDate;
    setGuid(guid) {
        this.guid = guid;
        return this;
    }
    setCreator(creator) {
        this.creator = creator;
        return this;
    }
    setTitle(title) {
        this.title = title;
        return this;
    }
    setLink(link) {
        this.link = link;
        return this;
    }
    setPubDate(pubDate) {
        this.pubDate = pubDate;
        return this;
    }
    setAuthor(author) {
        this.author = author;
        return this;
    }
    setContentSnippet(contentSnippet) {
        this.contentSnippet = contentSnippet;
        return this;
    }
    setCategories(categories) {
        this.categories = categories;
        return this;
    }
    setIsoDate(isoDate) {
        this.isoDate = isoDate;
        return this;
    }
    build() {
        return new Article(this.guid, this.creator, this.title, this.link, this.pubDate, this.author, this.contentSnippet, this.categories, this.isoDate);
    }
}
