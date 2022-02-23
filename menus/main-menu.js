import { prompt } from './_utilities.js'
import setupVerifier from './setup-verifier.js'
import createProject from './create-project.js'

const menus = {
  exit: () => { 
    console.clear() 
    process.exit() 
  },
  createProject,
  setupVerifier,
}

export default async function () {
  const { action } = await prompt({
    type: 'list',
    name: 'action',
    message: 'select action',
    choices: [
      { name: 'setup verifier assets', value: 'setupVerifier' },
      { name: 'create project from recipe', value: 'createProject' },
      { name: 'exit', value: 'exit' },
    ],
  })

  menus[action]()
}