import { prompt, status } from "./_utilities.js"
import mainMenu from "./main-menu.js"
import chalk from "chalk"

export default async function () {
  const { project } = await prompt({
    type: 'list',
    name: 'project',
    message: 'select project',
    choices: [
      { name: 'NextJS JWT Session w/DID Signature', value: 'nextjs-did' },
      { name: 'NextJS JWT Session w/Credential Verification', value: 'nextjs-verify' },
      { name: 'Cancel', value: 'cancel' },
    ]
  })

  if (project === 'cancel') return false
  let msg = 'Ability to create projects from recipes coming soon!\n'
  msg += chalk.reset.gray('... press any key to return to main menu')
  await status(msg, { keyPress: true })
  return mainMenu()
}