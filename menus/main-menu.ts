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

export default async function (): Promise<{
  exitCLI: () => void
  createProject: () => Promise<any>
  setupVerifier: ({ returnAssets }?: { returnAssets?: boolean }) => Promise<any>
  setupClaimer: () => Promise<any>
}> {
  const action = await mainMenu()
  return menus[action]()
}
