import { program } from "commander";
import colors from 'yoctocolors';

import create from "./commands/create.mjs";
import publish from "./commands/publish.mjs";

const VERSION = "0.1.2";

program
  .name('atrament-wizard')
  .description('CLI for Atrament')
  .version(VERSION);

program.command('create')
  .description('Create a new Atrament project')
  .argument('[project-name]', 'project folder name')
  .option('-d, --devel', 'Use development version of Atrament (unstable)')
  .action(async (projectFolder, options) => {
    console.log(colors.inverse('  Atrament Wizard: create new project  '));
    try {
      await create(projectFolder, options);
    } catch (e) {
      console.error(e);
    }
  });

program.command('publish')
  .summary('Publish story.js as Atrament HTML file')
  .description(`Publishes story.js as Atrament HTML file.
Run in the folder with ink story.js file. If file name is omitted, wizard searches for story js files in the current folder. If there are multiple story files found, user can choose which to use.`)
  .argument('[story-js-file]', 'story JS file')
  .action(async (inkScript, options) => {
    console.log(colors.inverse('  Atrament Wizard: publish  '));
    try {
      await publish(inkScript);
    } catch (e) {
      console.error(e);
    }
  });

export default function wizard() {
  program.parse(process.argv);
}
