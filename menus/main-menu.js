import setupVerifier from './setup-verifier.js'
import setupClaimer from './setup-claimer.js'
import createProject from './create-project.js'
import exitCLI from './exit-cli.js'
import { mainMenu } from './_prompts.js'

const menus = {
  exitCLI,
  createProject,
  setupVerifier,
  setupClaimer,
}

export default async function () {
  const action = await mainMenu()
  console.log(action)
  menus[action]()
}
