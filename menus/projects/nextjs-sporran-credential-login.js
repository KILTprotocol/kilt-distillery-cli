import { mainMenu, status } from "../_prompts.js"

export default async function () {
  await status('coming soon.. press any key to return to main menu', { keyPress: true })
  return await mainMenu()
}