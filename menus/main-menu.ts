import setupIdentity from './setup-identity'
import setupClaimer from './setup-claimer'
import createProject from './create-project'
import createCType from './create-ctype'
import exitCLI from './exit-cli'
import { mainMenu } from './_prompts'

const menus = {
  exitCLI,
  createProject,
  setupIdentity,
  setupClaimer,
  createCType,
}

export default async function () {
  const action = await mainMenu()
  //@ts-ignore
  return menus[action]()
}
