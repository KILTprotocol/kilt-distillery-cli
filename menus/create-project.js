import nextJsSporranCredentialLogin from "./projects/nextjs-sporran-credential-login.js";
import nextJsSporranDidLogin from "./projects/nextjs-sporran-did-login.js";
import { getDappName, getProjectRecipe, mainMenu, status } from "./_prompts.js";
import download from "download-git-repo";
import exitCli from "./exit-cli.js";

const projects = {
  'nextjs-sporran-did-login': nextJsSporranDidLogin,
  'nextjs-sporran-credential-login': nextJsSporranCredentialLogin,
  'test': 'paulpomerleau/recipe-template-testing',
}

async function downloadRecipe(repository, directory) {
  return new Promise((resolve, reject) => {
    download(repository, directory, error => {
      if (error) return reject({ ok: false })
      else return resolve({ ok: true })
    })
  })
}

export default async function () {
  const project = await getProjectRecipe()
  if (project === 'cancel') return await mainMenu()
  if (project === 'test') {
    const dappName = await getDappName()
    status('downloading files...')
    const result = downloadRecipe(projects[project], dappName)
    if (!result.ok) {
      await status('error downloading files... press any key to exit', { keyPress: true })
      return exitCli()
    }
    return projects[project]()
  } else {
    return projects[project]()
  }
}