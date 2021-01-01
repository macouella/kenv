/**
 * A JSONC-based env loader.
 */

// Dont check for these env vars (set in production / local only)
import fs from "fs"
import path from "path"
import colors from "colors"
import deepFreeze from "deep-freeze"
import { flatten } from "flat"
import { parse } from "json5"
import {
  addUsageLogging,
  cleanseKeys,
  KENV_KEYS,
  maskString,
  truncate,
} from "./utils"
import getDefinePluginConfig from "./webpack"
const DEFAULT_ENV_FILE = ".kenv.json"
const DEFAULT_ENV_SAMPLE_FILE = ".kenv.sample.json"

/**
 * Loads and parses a jsonc/json file.
 * @param {string} environmentPath
 */
const loadEnvironmentFile = (environmentPath: string) => {
  const cleanPath = path.resolve(process.cwd(), environmentPath)
  if (!fs.existsSync(cleanPath)) {
    throw new Error(`Env file ${cleanPath} not found.`)
  }
  const environmentFile = fs.readFileSync(path.resolve(cleanPath))
  const loadedVariables = parse(environmentFile.toString())
  return { loadedVariables, loadedFile: cleanPath }
}

/**
 * Loops through an object and appends the each key value to the process.
 * @param {object} environmentVariables
 */
const loadToProcess = (
  environmentVariables: Record<string, any>,
  freeze?: boolean
) => {
  const cleansedVariables = cleanseKeys(environmentVariables)
  if (freeze) deepFreeze(cleansedVariables)
  process.kenv = cleansedVariables
  return process.kenv
}

/**
 * Loads an environment file into process.
 * @param {string} environmentPath
 */
const loadFileIntoProcess = (environmentPath: string, freeze?: boolean) => {
  const { loadedVariables, loadedFile } = loadEnvironmentFile(environmentPath)
  const processKenv = loadToProcess(loadedVariables, freeze)
  return { processKenv, loadedFile }
}

const getMissingKeysMessage = ({
  toPath,
  fromPath,
  missingEnvKeys,
  withColours,
}: {
  toPath: string
  fromPath: string
  missingEnvKeys: string[]
  withColours?: boolean
}) => {
  const baseWarningName = "kenv [warning]:"
  const warningName = withColours
    ? colors.yellow(baseWarningName)
    : baseWarningName
  const joinedMissingKeys = missingEnvKeys.join(", ")
  const missingKeys = withColours
    ? colors.gray(joinedMissingKeys)
    : joinedMissingKeys

  const errorMessage = `${warningName} Env file ${toPath} is missing keys from ${fromPath}
${missingKeys}`

  return errorMessage
}

/**
 * Compares contents of a sample and actual env file.
 * Reports missing keys that exist in the sample env and not the actual env file.
 */
const validateEnvironment = ({
  loadedVariables,
  loadedVariablesPath,
  environmentSyncPath,
  whitelistKeys,
  throwOnMissingKeys = false,
}: {
  loadedVariables: object
  loadedVariablesPath: string
  environmentSyncPath: string
  whitelistKeys: Set<string>
  throwOnMissingKeys?: boolean
}) => {
  const {
    loadedVariables: environmentSyncVariables,
    loadedFile: fullEnvironmentSyncPath,
  } = loadEnvironmentFile(environmentSyncPath)
  const environmentSyncKeys = Object.keys(loadedVariables)
  const missingEnvironmentSyncKeys: string[] = []
  const envKeys = Object.keys(environmentSyncVariables)
  const missingEnvKeys: string[] = []

  environmentSyncKeys.forEach((environmentSyncKey) => {
    if (
      !envKeys.includes(environmentSyncKey) &&
      !whitelistKeys.has(environmentSyncKey)
    ) {
      missingEnvironmentSyncKeys.push(environmentSyncKey)
    }
  })

  envKeys.forEach((envKey) => {
    if (!environmentSyncKeys.includes(envKey) && !whitelistKeys.has(envKey)) {
      missingEnvKeys.push(envKey)
    }
  })

  if (missingEnvKeys.length > 0) {
    if (throwOnMissingKeys) {
      throw new Error(
        getMissingKeysMessage({
          fromPath: fullEnvironmentSyncPath,
          toPath: loadedVariablesPath,
          missingEnvKeys,
        })
      )
    } else {
      console.warn(
        `${getMissingKeysMessage({
          fromPath: fullEnvironmentSyncPath,
          toPath: loadedVariablesPath,
          missingEnvKeys,
          withColours: true,
        })}\n`
      )
    }
  }

  if (missingEnvironmentSyncKeys.length > 0) {
    if (throwOnMissingKeys) {
      throw new Error(
        getMissingKeysMessage({
          fromPath: loadedVariablesPath,
          toPath: fullEnvironmentSyncPath,
          missingEnvKeys: missingEnvironmentSyncKeys,
        })
      )
    } else {
      console.warn(
        `${getMissingKeysMessage({
          fromPath: loadedVariablesPath,
          toPath: fullEnvironmentSyncPath,
          missingEnvKeys: missingEnvironmentSyncKeys,
          withColours: true,
        })}\n`
      )
    }
  }
}

export type DotJsoncConfig = {
  environmentPath?: string
  environmentTemplatePath?: string
  devSyncPaths?: string[]
  whitelistKeys?: Array<string>
  throwOnMissingKeys?: boolean
  freeze?: boolean
  logUsage?: boolean
}

const getExistingSyncPaths = (devSyncPaths: string[]) => {
  return devSyncPaths.filter((filePath) => {
    const resolvedFile = path.resolve(process.cwd(), filePath)
    const fileExists = fs.existsSync(resolvedFile)
    if (!fileExists) {
      console.warn(
        `kenv [warning]: extraSyncPath ${resolvedFile} does not exist. If this was intentional, you may safely ignore this message.`
      )
    }
    return fileExists
  })
}

/**
 * Load json and jsonc (json with comments) files into a unique `process.kenv` property.
 */
export const config = ({
  environmentPath = DEFAULT_ENV_FILE,
  environmentTemplatePath = DEFAULT_ENV_SAMPLE_FILE,
  devSyncPaths = [],
  whitelistKeys = [],
  throwOnMissingKeys = false,
  freeze = false,
  logUsage = false,
}: DotJsoncConfig = {}) => {
  const {
    processKenv: loadedVariables,
    loadedFile: fullEnvironmentPath,
  } = loadFileIntoProcess(environmentPath, freeze)
  const existingSyncPaths = getExistingSyncPaths(devSyncPaths)
  const mergedSyncPaths = [environmentTemplatePath, ...existingSyncPaths]
  mergedSyncPaths.forEach((environmentSyncPath) =>
    validateEnvironment({
      loadedVariables,
      loadedVariablesPath: fullEnvironmentPath,
      environmentSyncPath,
      throwOnMissingKeys,
      whitelistKeys: new Set([...whitelistKeys, ...KENV_KEYS]),
    })
  )

  if (logUsage || loadedVariables.KENV_LOG_USAGE) {
    addUsageLogging({ obj: process.kenv })
  }

  return loadedVariables
}

type GetRedactedDumpConfig = {
  kenvironment?: Record<string, any>
  truncateLength?: number
  decimalPercentageToShow?: number
  hideKeys?: string[]
}

/**
 * Returns a flattened and redacted (masked) kenv dump.
 * Can be used along-side `console.log` to print a safe summary of the current
 * environment variables.
 */
export const getRedactedDump = ({
  kenvironment,
  truncateLength = 0,
  decimalPercentageToShow = 0.3,
  hideKeys = [],
}: GetRedactedDumpConfig = {}) => {
  const env = flatten(kenvironment || process.kenv) as Record<string, any>
  const redacted = Object.entries(env).reduce((acc, [key, _value]) => {
    if (!hideKeys.includes(key)) {
      let value = ["string"].includes(typeof _value)
        ? maskString(_value, decimalPercentageToShow)
        : _value

      if (truncateLength) {
        value = truncate(value, truncateLength)
      }
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)
  return redacted
}

export { getDefinePluginConfig }
