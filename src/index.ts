/**
 * A JSONC-based env loader.
 */

// Dont check for these env vars (set in production / local only)

import fs from "fs"
import path from "path"
import { parse } from "json5"
import { cleanseKeys } from "./utils"
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
  return loadedVariables
}

/**
 * Loops through an object and appends the each key value to the process.
 * @param {object} environmentVariables
 */
const loadToProcess = (environmentVariables: Record<string, any>) => {
  const cleansedVariables = cleanseKeys(environmentVariables)
  process.kenv = process.kenv || {}
  return Object.entries(cleansedVariables).reduce(function (
    accumulator,
    [_key, value]
  ) {
    const key = _key as string
    if (!Object.prototype.hasOwnProperty.call(process.kenv, key)) {
      process.kenv[key] = value
    }
    accumulator[key] = process.kenv[key]
    return accumulator
  },
  {} as Record<string, any>)
}

/**
 * Loads an environment file into process.
 * @param {string} environmentPath
 */
const loadFileIntoProcess = (environmentPath: string) => {
  const loadedVariables = loadEnvironmentFile(environmentPath)
  loadToProcess(loadedVariables)
  return loadedVariables
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
  const environmentSyncVariables = loadEnvironmentFile(environmentSyncPath)

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
    const errorMessage = `kenv [warning]:
Env file ${loadedVariablesPath} is missing keys from ${environmentSyncPath}
${missingEnvKeys.join(", ")}`

    if (throwOnMissingKeys) {
      throw new Error(errorMessage)
    } else {
      console.warn(`${errorMessage}\n`)
    }
  }

  if (missingEnvironmentSyncKeys.length > 0) {
    const errorMessage = `kenv [warning]:
Env file ${environmentSyncPath} is missing keys from ${loadedVariablesPath}
${missingEnvironmentSyncKeys.join(", ")}`

    if (throwOnMissingKeys) {
      throw new Error(errorMessage)
    } else {
      console.warn(`${errorMessage}\n`)
    }
  }
}

export type DotJsoncConfig = {
  environmentPath?: string
  environmentTemplatePath?: string
  extraSyncPaths?: string[]
  whitelistKeys?: Array<string>
  throwOnMissingKeys?: boolean
}

/**
 * Load json and jsonc (json with comments) files into a unique `process.kenv` property.
 */
export const config = ({
  environmentPath = DEFAULT_ENV_FILE,
  environmentTemplatePath = DEFAULT_ENV_SAMPLE_FILE,
  extraSyncPaths = [],
  whitelistKeys = [],
  throwOnMissingKeys = false,
}: DotJsoncConfig = {}) => {
  const loadedVariables = loadFileIntoProcess(environmentPath)
  const mergedSyncPaths = [environmentTemplatePath, ...extraSyncPaths]
  mergedSyncPaths.forEach((environmentSyncPath) =>
    validateEnvironment({
      loadedVariables,
      loadedVariablesPath: environmentPath,
      environmentSyncPath,
      throwOnMissingKeys,
      whitelistKeys: new Set(whitelistKeys),
    })
  )
  return loadedVariables
}
