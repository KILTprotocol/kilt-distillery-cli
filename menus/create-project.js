import { getDappName, getRecipeProject, mainMenu, status } from "./_prompts.js";
import download from "download-git-repo";
import exitCli from "./exit-cli.js";

async function downloadRecipe(repository, directory) {
  return new Promise((resolve, reject) => {
    download(repository, directory, error => {
      if (error) return reject({ ok: false })
      else return resolve({ ok: true })
    })
  })
}

export default async function () {
  const project = await getRecipeProject()
  if (!project) return await mainMenu()
  const dappName = await getDappName()
  await status('downloading project files...')
  const result = await downloadRecipe(project.repo, dappName)
  if (!result.ok) {
    await status('error downloading files... press any key to exit', { keyPress: true })
    return exitCli()
  }
  return await project.create(dappName)
}