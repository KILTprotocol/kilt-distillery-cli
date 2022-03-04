import nextJsSporranCredentialLogin from "./projects/nextjs-sporran-credential-login.js";
import nextJsSporranDidLogin from "./projects/nextjs-sporran-did-login.js";
import { getProjectRecipe, mainMenu } from "./_prompts.js";

const projects = {
  'nextjs-sporran-did-login': nextJsSporranDidLogin,
  'nextjs-sporran-credential-login': nextJsSporranCredentialLogin,
}

export default async function () {
  const project = await getProjectRecipe()
  if (project === 'cancel') return await mainMenu()
  return projects[project]()
}