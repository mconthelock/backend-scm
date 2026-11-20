import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mjml2html from 'mjml';

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(currentDir, '..');
const mjmlDir = join(projectRoot, 'src/common/mail/templates/mjml');
const htmlDir = join(projectRoot, 'src/common/mail/templates/html');

async function compileMjml() {
    console.log('Compiling MJML templates to HTML...');
    const files = await fs.readdir(mjmlDir);
    const mjmlFiles = files.filter((f) => f.endsWith('.mjml'));

    for (const file of mjmlFiles) {
        const filePath = join(mjmlDir, file);
        const mjmlContent = await fs.readFile(filePath, 'utf-8');

        const result = await mjml2html(mjmlContent, {
            validationLevel: 'soft',
            minify: false,
        });

        const html = result.html;
        const errors = result.errors;

        if (errors && errors.length > 0) {
            console.warn(`Warnings in ${file}:`, errors);
        }

        const outFileName = file.replace(/\.mjml$/, '.html');
        const outFilePath = join(htmlDir, outFileName);

        await fs.writeFile(outFilePath, html, 'utf-8');
        console.log(`✓ Compiled: ${file} -> ${outFileName}`);
    }
    console.log('All MJML templates compiled successfully.');
}

compileMjml().catch((err) => {
    console.error('Failed to compile MJML:', err);
    process.exit(1);
});
