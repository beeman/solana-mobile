import { resolve } from 'node:path'
import { cancel, intro, isCancel, log, note, outro, select, text } from '@clack/prompts'
import { InvalidArgumentError } from 'commander'
import {
  type CreateSolanaDappInternals,
  type CreateSolanaDappMenuConfig,
  type CreateSolanaDappPackageManager,
  type CreateSolanaDappTemplate,
  loadCreateSolanaDappInternals,
} from './create-solana-dapp-internals.ts'

export const CUSTOM_TEMPLATES_URL = 'https://raw.githubusercontent.com/solana-mobile/templates/main/templates.json'

const SOLANA_MOBILE_MENU_CONFIG: CreateSolanaDappMenuConfig = [
  {
    description: 'Solana Mobile templates',
    groups: ['mobile'],
    id: 'solana-mobile',
    keywords: [],
    name: 'Solana Mobile',
  },
]

type CreateOptions = {
  dryRun?: boolean
  listTemplateIds?: boolean
  listTemplates?: boolean
  listVersions?: boolean
  minimal?: boolean
  packageManager?: CreateSolanaDappPackageManager
  projectName?: string
  skipGit?: boolean
  skipInit?: boolean
  skipInstall?: boolean
  template?: string
  verbose?: boolean
}
export type CreateCommandOptions = CreateOptions

type RunCreateOptions = {
  internals?: CreateSolanaDappInternals
  promptProjectName?: (internals: CreateSolanaDappInternals) => Promise<string | undefined>
  selectTemplate?: (templates: CreateSolanaDappTemplate[]) => Promise<CreateSolanaDappTemplate | undefined>
}

export async function runCreate(
  options: CreateCommandOptions,
  {
    internals: injectedInternals,
    promptProjectName: promptProjectNameInput = promptProjectName,
    selectTemplate = selectCustomTemplate,
  }: RunCreateOptions = {},
) {
  try {
    const internals = injectedInternals ?? (await loadCreateSolanaDappInternals())
    const packageManager = options.packageManager ?? internals.detectInvokedPackageManager()

    if (options.listVersions) {
      internals.listVersions()
      return
    }

    const { templates } = await internals.fetchTemplateData({
      config: SOLANA_MOBILE_MENU_CONFIG,
      url: CUSTOM_TEMPLATES_URL,
      verbose: options.verbose ?? false,
    })

    if (options.listTemplates) {
      internals.listTemplates({ templates })
      return
    }

    if (options.listTemplateIds) {
      console.log(JSON.stringify(internals.listTemplateIds({ templates })))
      return
    }

    intro('solana-mobile create')

    const projectName = options.projectName ?? (await promptProjectNameInput(internals))

    if (!projectName) {
      process.exitCode = 1
      return
    }

    const template = options.template ? resolveTemplate(options.template, templates) : await selectTemplate(templates)

    if (!template) {
      process.exitCode = 1
      return
    }

    const targetDirectory = resolve(process.cwd(), projectName)
    const createArgs = {
      app: internals.getAppInfo(),
      dryRun: options.dryRun ?? false,
      name: projectName,
      packageManager,
      skipGit: options.skipGit ?? false,
      skipInit: options.skipInit ?? false,
      skipInstall: options.skipInstall ?? false,
      targetDirectory,
      template,
      verbose: options.verbose ?? false,
    }

    if (options.dryRun) {
      note(JSON.stringify(createArgs, undefined, 2), 'Arguments')
      outro('Dry run was used, no changes were made')
      return
    }

    if (options.verbose) {
      log.warn('Verbose output enabled')
      console.warn(createArgs)
    }

    const instructions = await internals.createApp(createArgs)

    note(
      internals.finalNote({
        ...createArgs,
        instructions,
        target: createArgs.targetDirectory.replace(process.cwd(), '.'),
      }),
      'Installation successful',
    )

    outro('Good luck with your project!')
  } catch (error) {
    cancel(`${error}`)
    process.exitCode = 1
  }
}

export function parsePackageManagerOption(next: string): CreateSolanaDappPackageManager {
  if (!next || !isPackageManager(next)) {
    throw new InvalidArgumentError(`Invalid package manager: ${next}`)
  }

  return next
}

function isPackageManager(value: string): value is CreateSolanaDappPackageManager {
  return value === 'bun' || value === 'npm' || value === 'pnpm' || value === 'yarn'
}

async function promptProjectName(internals: CreateSolanaDappInternals) {
  const projectName = await text({
    message: 'Enter project name',
    validate: (value) => internals.validateProjectName(value ?? '') ?? undefined,
  })

  if (isCancel(projectName)) {
    cancel('Operation cancelled.')
    return undefined
  }

  return projectName
}

async function selectCustomTemplate(templates: CreateSolanaDappTemplate[]) {
  const template = await select<CreateSolanaDappTemplate>({
    message: 'Select a template',
    options: templates.map((template) => ({
      hint: template.description,
      label: template.name,
      value: template,
    })),
  })

  if (isCancel(template)) {
    cancel('Operation cancelled.')
    return undefined
  }

  return template
}

function resolveTemplate(templateName: string, templates: CreateSolanaDappTemplate[]) {
  const template = templates.find(
    (template) =>
      template.name === templateName ||
      template.path === templateName ||
      template.id === templateName ||
      template.id.endsWith(`/${templateName}`),
  )

  if (template) {
    return template
  }

  return {
    description: `${templateName} (external)`,
    id: templateName.includes(':') ? templateName : `gh:${templateName}`,
    name: templateName,
  }
}
