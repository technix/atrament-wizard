import { program } from "commander";
import colors from 'yoctocolors';

import create from "./commands/create.mjs";

program
  .name('atrament-wizard')
  .description('CLI for Atrament')
  .version('0.1.0');

program.command('create')
  .description('Create a new Atrament project')
  .argument('[project-name]', 'project folder name')
  .action(async (projectFolder, options) => {
    console.log(colors.inverse('  Atrament Wizard: create new project  '));
    try {
      await create(projectFolder);
    } catch (e) {
      console.error(e);
    }
  });

export default function wizard() {
  program.parse();
}
