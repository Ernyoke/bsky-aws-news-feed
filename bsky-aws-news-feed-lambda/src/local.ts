import {ArticleBuilder} from "shared";
import {Context, SQSEvent} from "aws-lambda";
import {handler} from "./index.js";
import {dedent} from "ts-dedent";

const article = new ArticleBuilder()
    .setGuid("d124da9d46c82ffe484fed33ff86d7b941bf09ca")
    .setTitle('Certificate-Based Authentication is now available on Amazon AppStream 2.0 multi-session fleets')
    .setContentSnippet(dedent`&lt;p&gt;Amazon AppStream 2.0 improves the end-user experience by adding support for
    certificate-based authentication (CBA) on multi-session fleets running the Microsoft Windows operating
    system and joined to an Active Directory. This functionality helps administrators to leverage the cost
    benefits of the multi-session model while providing an enhanced end-user experience. By combining these
    enhancements with the existing advantages of multi-session fleets, AppStream 2.0 offers a solution that
    helps balance cost-efficiency and user satisfaction.&lt;br&gt; &lt;br&gt; By using certificate-based
    authentication, you can rely on the security and logon experience features of your SAML 2.0 identity
    provider, such as passwordless authentication, to access AppStream 2.0 resources. Certificate-based
    authentication with AppStream 2.0 enables a single sign-on logon experience to access domain-joined
    desktop and application streaming sessions without separate password prompts for Active Directory.&lt;br&gt;
    &lt;br&gt; This feature is available at no additional cost in all the AWS &lt;a
    href="https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/" target="_blank"&gt;Regions&lt;/a&gt;
    where Amazon AppStream 2.0 is available. AppStream 2.0 offers pay-as-you go &lt;a
    href="https://aws.amazon.com/appstream2/pricing/" target="_blank"&gt;pricing&lt;/a&gt;. To get started
    with AppStream 2.0, see &lt;a href="https://aws.amazon.com/appstream2/getting-started/" target="_blank"&gt;Getting
    Started with Amazon AppStream 2.0&lt;/a&gt;.&lt;br&gt; &lt;br&gt; To enable this feature for your users,
    you must use an AppStream 2.0 image that uses &lt;a
    href="https://docs.aws.amazon.com/appstream2/latest/developerguide/base-images-agent.html"
    target="_blank"&gt;AppStream 2.0 agent&lt;/a&gt; released on or after February 7, 2025&amp;nbsp;or your
    image is using &lt;a
    href="https://docs.aws.amazon.com/appstream2/latest/developerguide/administer-images.html#keep-image-updated-managed-image-updates"
    target="_blank"&gt;Managed AppStream 2.0 image updates&lt;/a&gt; released on or after February 11, 2025.&lt;br&gt;
    &amp;nbsp;&lt;/p&gt;
    `)
    .setLink("https://aws.amazon.com/about-aws/whats-new/2025/02/certificate-based-authentication-amazon-appstream-2-0-multi-session-fleets")
    .setCategories(["AWS", "IoT"])
    .setPubDate("Fri, 21 Feb 2025 22:30:00 GMT")
    .setIsoDate("2020-05-01")
    .setAuthor('AWS')
    .build()

const event = {
    Records: [
        {
            messageId: article.guid,
            body: JSON.stringify(article)
        }
    ]
} as SQSEvent;

await handler(event, {} as Context, () => {
    console.log("Finished");
});