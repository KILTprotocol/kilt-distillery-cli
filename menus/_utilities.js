import inquirer from 'inquirer'
import chalk from 'chalk' 

export async function status(msg, opts = {}) {
  return new Promise(async resolve => {
    const { wait = 500, keyPress = false } = opts
    console.clear()
    console.log(chalk.bold(` KILT DISTILLERY CLI - ${chalk.reset(msg)}`))
    if (!keyPress) return setTimeout(resolve, wait)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', resolve)
  })
}

export async function prompt(prompt) {
  console.clear()
  return await inquirer.prompt({
    ...prompt,
    prefix: `${chalk.bold(' KILT CLI ')}-`,
  })
}