import { status } from '../_prompts'
import { exec } from 'child_process'
import util from 'util'
import exitCli from '../exit-cli'
const promisifyExec = util.promisify(exec)

export async function initialiseProject(dappName: string) {
  await status('initializing project...')
  process.chdir(dappName)

  await status('installing dependencies...')
  await promisifyExec('yarn install')
  await status('building...')
  await promisifyExec('yarn run build')
  await status('Creating a well known did config')
  await promisifyExec('yarn run did-configuration')
  await status('start project with: yarn run start')

  return exitCli()
}
