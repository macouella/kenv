import { flatten, unflatten } from "flat"
const REGEX_VALID_KEY = /^\w+$/

/**
 * Removes invalid values from an object.
 * @param kenvironment
 */
export const cleanseKeys = <T extends Record<string, any>>(
  kenvironment: T
): T => {
  const flattened = flatten(kenvironment) as Record<string, any>
  const failedKeys: string[] = []

  const reduced = Object.entries(flattened).reduce((acc, [key, value]) => {
    if (REGEX_VALID_KEY.test(key)) {
      acc[key] = value
    } else {
      failedKeys.push(key)
    }
    return acc
  }, {} as Record<string, string>)

  if (failedKeys.length > 0) {
    console.warn(
      `kenv [warning]: Invalid keys found: ${failedKeys.join(
        ", "
      )}. They won't be made available via process.kenv. Only alphanumeric characters and undscores are allowed.`
    )
  }

  const unflattened = unflatten(reduced)
  return unflattened as T
}
