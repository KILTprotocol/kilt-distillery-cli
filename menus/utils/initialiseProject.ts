import { status } from '../_prompts'
import { exec } from 'child_process'
import util from 'util'
import exitCli from '../exit-cli'

const promisifyExec = util.promisify(exec)

export async function initialiseProject(projectPath: string) {
  await status('initializing project...')
  process.chdir(projectPath)
  await status('installing dependencies...', { wait: 1500 })
  const options = { cwd: projectPath }
  await status('installing dependencies...', { wait: 1500 })
  await promisifyExec('yarn install', options)
  await status('building...', { wait: 1500 })
  await promisifyExec('yarn run build', options)
  await status('Creating a well known did config', { wait: 1500 })
  await promisifyExec('yarn run did-configuration', options)
  await status('start project with: yarn run start', { wait: 1500 })

  return exitCli()
}
