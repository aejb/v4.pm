import fastGlob from 'fast-glob';
import replaceMap from 'replace-map';
import assert from 'assert';
import { promises } from 'fs';
import { sep, join } from 'path';

const getRedirects = async () => {
    const redirectData = {};

    // Get all the files that are redirects
    const files = await fastGlob(['data/**/*.js']);
    for (const file of files) {
        // Import the redirect data
        const fileData = await import(`./${file}`);

        // Validate
        assert(Object.prototype.hasOwnProperty.call(fileData, 'target'));

        // Store
        redirectData[file.slice(0, -3).split(sep).slice(1).join(sep)] = fileData;
    }

    return redirectData;
};

const getTemplate = () => promises.readFile('templates/redirect.html', 'utf8');

const get404 = () => promises.readFile('templates/404.html', 'utf8');

const cleanOutput = () => promises.rmdir('out', { recursive: true });

const generateRedirect = (template, redirect) => {
    // Generate a map of {{ key }} => value
    const map = Object.fromEntries(Object.entries(redirect).map(([key, value]) => ([`{{ ${key} }}`, value])));

    // Insert our map into the template
    return replaceMap(template, map);
};

const writeRedirect = async (source, path) => {
    // Root key handling
    if (path === '_index') path = '';

    // Create the full directory
    await promises.mkdir(join('out', path), { recursive: true });

    // Write the file
    await promises.writeFile(join('out', path, 'index.html'), source);
};

const write404 = async (source) => {
    await promises.mkdir('out', { recursive: true });
    await promises.writeFile(join('out', '404.html'), source);
};

const main = async () => {
    const template = await getTemplate();
    const redirects = await getRedirects();

    await cleanOutput();

    // Generate file for each redirect route
    for (const [name, data] of Object.entries(redirects)) {
        const source = generateRedirect(template, data);
        await writeRedirect(source, name);
    }

    const template404 = await get404();
    const source404 = generateRedirect(template404, { map: JSON.stringify(redirects) });
    await write404(source404);
};

main().then(() => console.log('Generated'));
