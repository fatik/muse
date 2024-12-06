const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const fs = require('fs').promises;
const marked = require('marked');

async function syncNotion() {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const n2m = new NotionToMarkdown({ notionClient: notion });

    const pages = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        filter: {
            property: 'Status',
            status: { equals: 'Published' }
        }
    });

    const posts = [];

    for (const page of pages.results) {
        const title = page.properties.Name.title[0].plain_text;
        const slug = page.properties.Slug.rich_text[0].plain_text;
        
        const mdBlocks = await n2m.pageToMarkdown(page.id);
        const markdown = n2m.toMarkdownString(mdBlocks);
        
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, system-ui, sans-serif;
            line-height: 1.6;
            max-width: 650px;
            margin: 40px auto;
            padding: 0 10px;
            color: #333;
            background: #fff;
        }
        a { color: #333; }
    </style>
</head>
<body>
    <a href="./">← Back</a>
    <h1>${title}</h1>
    ${marked.parse(markdown)}
    <div style="margin-top: 40px; color: #666;">
        Last updated: ${new Date().toLocaleDateString()}
    </div>
</body>
</html>`;

        await fs.writeFile(`${slug}.html`, html);
        posts.push({ 
            title, 
            slug,
            date: new Date().toLocaleDateString() 
        });
    }

    await fs.writeFile('posts.json', JSON.stringify(posts, null, 2));
}

syncNotion().catch(console.error);