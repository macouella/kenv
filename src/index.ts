/**
 * A JSONC-based env loader.
 */

// Dont check for these env vars (set in production / local only)

import fs from "fs"
import path from "path"
import { parse } from "json5"
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
  process.kenv = process.kenv || {}
  return Object.entries(environmentVariables).reduce(function (
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
  sampleEnvironmentPath,
  whitelistKeys,
  throwOnMissingKeys = false,
}: {
  loadedVariables: object
  loadedVariablesPath: string
  sampleEnvironmentPath: string
  whitelistKeys: Set<string>
  throwOnMissingKeys?: boolean
}) => {
  const sampleVariables = loadEnvironmentFile(sampleEnvironmentPath)

  const sampleKeys = Object.keys(loadedVariables)
  const envKeys = Object.keys(sampleVariables)
  const missingSampleKeys: string[] = []
  const missingEnvKeys: string[] = []

  sampleKeys.forEach((sampleKey) => {
    if (!envKeys.includes(sampleKey) && !whitelistKeys.has(sampleKey)) {
      missingSampleKeys.push(sampleKey)
    }
  })

  envKeys.forEach((envKey) => {
    if (!sampleKeys.includes(envKey) && !whitelistKeys.has(envKey)) {
      missingEnvKeys.push(envKey)
    }
  })

  if (missingEnvKeys.length > 0) {
    const errorMessage = `[warn] env-loader:
Env file ${loadedVariablesPath} is missing keys from ${sampleEnvironmentPath}
${missingEnvKeys.join(", ")}`

    if (throwOnMissingKeys) {
      throw new Error(errorMessage)
    } else {
      console.warn(`${errorMessage}\n`)
    }
  }

  if (missingSampleKeys.length > 0) {
    const errorMessage = `env-loader [warning]:
Env file ${sampleEnvironmentPath} is missing keys from ${loadedVariablesPath}
${missingSampleKeys.join(", ")}`

    if (throwOnMissingKeys) {
      throw new Error(errorMessage)
    } else {
      console.warn(`${errorMessage}\n`)
    }
  }
}

export type DotJsoncConfig = {
  environmentPath?: string
  sampleEnvironmentPath?: string
  whitelistKeys?: Array<string>
  throwOnMissingKeys?: boolean
}

export const config = ({
  environmentPath = DEFAULT_ENV_FILE,
  sampleEnvironmentPath = DEFAULT_ENV_SAMPLE_FILE,
  whitelistKeys = [],
  throwOnMissingKeys = false,
}: DotJsoncConfig = {}) => {
  const loadedVariables = loadFileIntoProcess(environmentPath)
  validateEnvironment({
    loadedVariables,
    loadedVariablesPath: environmentPath,
    sampleEnvironmentPath,
    throwOnMissingKeys,
    whitelistKeys: new Set(whitelistKeys),
  })
  return loadedVariables
}
