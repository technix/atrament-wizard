import axios from 'axios';

const githubUser = 'technix';
const githubRepo = 'atrament-web-ui';

export async function getLatestRelease() {
  let response;
  try {
    response = await axios({
      method: 'GET',
      url: `https://api.github.com/repos/${githubUser}/${githubRepo}/releases/latest`,
      responseType: 'json',
    });
  } catch (e) {
    return false;
  }
  return response.data;
}