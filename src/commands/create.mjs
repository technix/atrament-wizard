
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import axios from 'axios';
import AdmZip from 'adm-zip';
import enquirer from 'enquirer';
import ora from 'ora';
import { getLatestRelease } from '../util.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tmpZip = '_atrament-web-ui-tmp.zip';

async function getZipUrl() {
  const release = await getLatestRelease();
  return release.zipball_url;
}

async function downloadZip(url, zipFile) {
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'arraybuffer',
  });
  fs.writeFileSync(zipFile, response.data);
}

async function extractZip(projectPath, zipFile) {
  fs.mkdirSync(projectPath, { recursive: true });
  const zip = new AdmZip(zipFile);
  const zipEntries = zip.getEntries();

  // Detect the common prefix (e.g. top-level random folder)
  const topLevelFolder = zipEntries
    .map(entry => entry.entryName.split('/')[0])
    .filter(name => name) // filter out empty
    .reduce((a, b) => (a === b ? a : null));

  zipEntries.forEach(entry => {
    if (entry.isDirectory) return;

    let relativePath = entry.entryName;

    // Remove the top-level folder from the path
    if (topLevelFolder && relativePath.startsWith(`${topLevelFolder}/`)) {
      relativePath = relativePath.slice(topLevelFolder.length + 1);
    }

    const outputPath = path.join(projectPath, relativePath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, entry.getData());
  });
}

async function run(projectName, projectPath, zipFile, cfg) {
  const spinnerGetZip = ora('Retrieving release information...').start();
  const zipUrl = await getZipUrl();
  if (!zipUrl) {
    spinnerGetZip.fail("Failed to fetch release information from GitHub.");
    return;
  }
  spinnerGetZip.succeed();

  const spinnerDownloadZip = ora(`Downloading Atrament UI: ${zipUrl}`).start();
  await downloadZip(zipUrl, zipFile);
  spinnerDownloadZip.succeed();

  const spinnerCreateProject = ora(`Creating project: ${projectName}`).start();
  await extractZip(projectPath, zipFile);
  fs.rmSync(zipFile);
  spinnerCreateProject.succeed();

  console.log("> Installing dependencies");
  process.chdir(projectPath);
  execSync('npm install --loglevel error', {stdio: 'inherit'});
  execSync('npm run install-inklecate', {stdio: 'inherit'});

  console.log('> Updating atrament.config.js');
  const atramentConfig = path.join(projectPath, 'atrament.config.json');
  let atramentConfigJSON = {};
  try {
    const fileContent = fs.readFileSync(atramentConfig, 'utf-8');
    atramentConfigJSON = JSON.parse(fileContent);
  } catch (err) {
    console.error('Error reading or parsing JSON:', err.message);
  }
  atramentConfigJSON.name = cfg.projectName;
  atramentConfigJSON.short_name = cfg.projectShortname;
  atramentConfigJSON.description = cfg.projectDescription;
  atramentConfigJSON.theme = cfg.defaultTheme;
  atramentConfigJSON.font = cfg.defaultFont;
  atramentConfigJSON.language = cfg.language;
  if (cfg.language === 'ua') {
    atramentConfigJSON.locale = 'uk_UA';
  }
  atramentConfigJSON.game.source = cfg.projectInkFile;

  try {
    fs.writeFileSync(atramentConfig, JSON.stringify(atramentConfigJSON, null, 2));
  } catch (err) {
    console.error('Error writing atrament.config.json:', err.message);
  }

  console.log('> Done.');
}

async function configure(projectFolder) {
  const config = await enquirer.prompt([
    {
      type: 'input',
      name: 'projectFolder',
      message: 'Project folder:',
      initial: projectFolder || 'my-atrament-game'
    },
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      initial: 'My Atrament Game'
    },
    {
      type: 'input',
      name: 'projectShortname',
      message: 'Project codename:',
      initial: 'my.atrament.game'
    },
    {
      type: 'input',
      name: 'projectDescription',
      message: 'Project description:',
      initial: 'My first Atrament game'
    },    
    {
      type: 'input',
      name: 'projectInkFile',
      message: 'Main Ink file:',
      initial: 'story.ink'
    },
    {
      type: 'select',
      name: 'defaultTheme',
      message: 'Default color theme:',
      choices: ['light', 'sepia', 'dark'],
      initial: 'light'
    },
    {
      type: 'select',
      name: 'defaultFont',
      message: 'Default font:',
      choices: ['System', 'Sans Serif', 'Serif', 'Monospaced', 'Fira Sans', 'Lora', 'Merriweather', 'OpenDyslexic'],
      initial: 'System'
    },
    {
      type: 'select',
      name: 'language',
      message: 'UI language:',
      choices: [
        { message: 'English', name: 'en' },
        { message: 'Ukrainian', name: 'ua' }
      ],
      initial: 'en'
    },
  ]);
  return config;
}

export default async function actionCreate(projectFolder) {
  let config;
  let configIsOK = false;
  while (!configIsOK) {
    config = await configure(projectFolder);
    console.log('');
    const prompt = new enquirer.Confirm({
      name: 'question',
      message: 'Proceed with these settings?',
      initial: true
    });
    configIsOK = await prompt.run();
  }
  console.log('');
  const projectPath = path.join(process.cwd(), config.projectFolder);
  const tmpZipFile = path.join(__dirname, tmpZip);
  
  run(config.projectFolder, projectPath, tmpZipFile, config);
}
