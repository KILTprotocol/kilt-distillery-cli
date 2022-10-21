import { getDappName, getRecipeProject, mainMenu, status } from './_prompts'
//@ts-ignore
import download from 'download-git-repo'
import exitCli from './exit-cli'

async function downloadRecipe(repository: string, directory: any) {
  return new Promise((resolve, reject) => {
    download(repository, directory, (error: any) => {
      if (error) {
        return reject({ ok: false })
      }

      return resolve({ ok: true })
    })
  })
}

export default async function (): Promise<void> {
  const project = await getRecipeProject()
  if (!project) {
    return await mainMenu()
  }

  const dappName = await getDappName()
  await status('downloading project files...')
  const result = await downloadRecipe(project.repo, dappName)
  //@ts-ignore
  if (!result.ok) {
    await status('error downloading files... press any key to exit', {
      keyPress: true,
      wait: 0,
    })
    return exitCli()
  }

  return await project.create(dappName)
}
