import setupVerifier from './setup-verifier.js'
import createProject from './create-project.js'
import exitCLI from './exit-cli.js'
import { mainMenu } from './_prompts.js'

const menus = {
  exitCLI,
  createProject,
  setupVerifier,
}

export default async function () {
  const action = await mainMenu()
  console.log(action)
  menus[action]()
}