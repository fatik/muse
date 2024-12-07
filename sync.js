const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const fs = require('fs').promises;
const marked = require('marked');

async function syncNotion() {
   try {
       console.log('Starting sync...');
       const notion = new Client({ auth: process.env.NOTION_API_KEY });
       const n2m = new NotionToMarkdown({ notionClient: notion });

       console.log('Querying database...');
       const pages = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        filter: {
            property: 'status',
            select: {           
                equals: 'Published'
            }
        }
    });

       console.log(`Found ${pages.results.length} published pages`);
       const posts = [];

       for (const page of pages.results) {
           try {
               console.log(`Processing page: ${page.id}`);
               const title = page.properties.Name.title[0].plain_text;
               const slug = page.properties.Slug.rich_text[0].plain_text;
               
               console.log(`Title: ${title}, Slug: ${slug}`);
               
               const mdBlocks = await n2m.pageToMarkdown(page.id);
               const markdown = n2m.toMarkdownString(mdBlocks).parent;
               console.log('Generated markdown');
               
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

               console.log(`Writing ${slug}.html`);
               await fs.writeFile(`${slug}.html`, html);
               posts.push({ 
                   title, 
                   slug,
                   date: new Date().toLocaleDateString() 
               });
               console.log(`Processed ${title}`);
           } catch (error) {
               console.error(`Error processing page ${page.id}:`, error);
           }
       }

       console.log('Writing posts.json');
       await fs.writeFile('posts.json', JSON.stringify(posts, null, 2));
       console.log('Sync completed successfully');
   } catch (error) {
       console.error('Sync failed:', error);
       throw error;
   }
}

syncNotion().catch(console.error);