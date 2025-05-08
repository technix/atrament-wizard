import fs, { existsSync } from 'node:fs';
import axios from 'axios';
import enquirer from 'enquirer';
import ora from 'ora';
import { getLatestRelease } from '../util.mjs';

const TEMPLATE_ASSET = "template.html";
const TEMPLATE = "index.html";

async function getTemplateUrl() {
  const release = await getLatestRelease();
  const templateUrl = release.assets?.find((asset) => asset.name === TEMPLATE_ASSET).browser_download_url;
  return templateUrl;
}

async function fetchAtramentTemplate(templateUrl) {
  let response = {};
  try {
    response = await axios({
      method: 'GET',
      url: templateUrl,
      responseType: 'document',
    });
  } catch (e) {
    return false;
  }  
  return response.data;
}

function processTemplate(content, inkScript) {
  const outputContent = content.replace("%INK_SCRIPT%", inkScript);
  fs.writeFileSync(TEMPLATE, outputContent);
}

export default async function actionMake(inkScript) {
  let inkScriptFile;
  if (inkScript) {
    const spinnerCheckFile = ora('Check if ink story file exists...').start();
    if (!fs.existsSync(inkScript)) {
      spinnerCheckFile.fail(`Ink story file ${inkScript} does not exist in the current directory`);
      return;
    }
    inkScriptFile = inkScript;
    spinnerCheckFile.succeed(`Ink story file: ${inkScriptFile}`);
  } else {
    const spinnerFindFile = ora('Searching for Ink story files in current directory...').start();
    const currentDirContent = fs.readdirSync( process.cwd() );
    const inkScripts = currentDirContent.filter((filename) => filename.endsWith('.js'));
    if (inkScripts.length > 1) {
      spinnerFindFile.stop();
      const selectedInkScript = await enquirer.prompt({
        type: 'select',
        name: 'file',
        message: 'Choose Ink story file:',
        choices: inkScripts
      });
      inkScriptFile = selectedInkScript.file;
    } else {
      inkScriptFile = inkScripts[0];
      if (!inkScriptFile) {
        spinnerFindFile.fail(`No Ink story files found in the current directory`);
        return;
      }
      spinnerFindFile.succeed(`Ink script file: ${inkScriptFile}`);
    }
  }

  const spinnerDownloadTemplate = ora('Downloading template...').start();
  const templateUrl = await getTemplateUrl();
  if (!templateUrl) {
    spinnerDownloadTemplate.fail("Failed to get Atrament template URL");
    return;
  }
  const content = await fetchAtramentTemplate(templateUrl);
  if (!content) {
    spinnerDownloadTemplate.fail(`Failed to download Atrament template: ${templateUrl}`);
    return;
  }
  spinnerDownloadTemplate.succeed(`Template: ${templateUrl}`);

  const spinnerProcessing = ora("Processing...").start();
  processTemplate(content, inkScriptFile);
  spinnerProcessing.succeed("Done.");
}
