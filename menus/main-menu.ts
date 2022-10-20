import setupVerifier from './setup-verifier'
import setupClaimer from './setup-claimer'
import createProject from './create-project'
import exitCLI from './exit-cli'
import { mainMenu } from './_prompts'

const menus = {
  exitCLI,
  createProject,
  setupVerifier,
  setupClaimer,
}

export default async function () {
  const action = await mainMenu()
  //@ts-ignore
  return menus[action]()
}
