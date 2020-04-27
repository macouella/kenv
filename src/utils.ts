import colors from "colors"
import { flatten, unflatten } from "flat"

// We only want keys that start with alphanumeric and underscores.
const REGEX_VALID_KEY = /^\w/

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
    const isValidKey = key
      .split(".")
      .every((keyPart) => REGEX_VALID_KEY.test(keyPart))
    if (isValidKey) {
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

/**
 * Masks a string to prevent showing sensitive information.
 * @param word
 */
export const maskString = (word: string, decimalPercentageToShow = 0.3) =>
  word
    .split("")
    .map((r, idx) => (idx < word.length * decimalPercentageToShow ? r : "*"))
    .join("")

/**
 * Truncates a primitive type.
 * @param word
 * @param length
 */
export const truncate = (word: any, length?: number) => {
  const toString = word.toString().split("")
  return [...new Array(length || 20)]
    .map((k, idx) => {
      return toString[idx] || " "
    })
    .concat(["  "])
    .join("")
}

/**
 * Adds getter logging to a single property.
 */
const addLoggingToProperty = ({
  obj,
  prop,
  parentKey,
}: {
  obj: any
  prop: string
  parentKey?: string
}) => {
  let _value = obj[prop]
  Object.defineProperty(obj, prop, {
    get() {
      const stack = new Error().stack?.split("\n")
      const sourceFileLine = stack && stack[2].match(/\(\/.*\)/)
      let sourceFilePath = sourceFileLine && sourceFileLine[0].split(")")[0]
      sourceFilePath = sourceFilePath && sourceFilePath?.replace(/[()]/g, "")
      const formattedKey = [parentKey, prop].filter(Boolean).join(".")
      const truncatedKey = truncate(formattedKey, 50)
      const truncatedValue = truncate(
        ["string"].includes(typeof _value) ? maskString(_value) : _value,
        20
      )
      console.log(
        colors.gray("[kenv]"),
        colors.green(truncatedKey),
        truncatedValue
      )
      if (sourceFilePath) {
        console.log(colors.gray(`       ${sourceFilePath}`))
      }

      return _value
    },
    set(value) {
      _value = value
    },
  })
}

/**
 * Adds logging middleware to report when
 * object properties are accessed.
 */
export const addUsageLogging = function ({
  obj,
  parentKey,
}: {
  obj: any
  parentKey?: string
}) {
  Object.getOwnPropertyNames(obj).forEach(function (prop) {
    if (typeof obj[prop] === "object" || typeof obj[prop] === "function") {
      addUsageLogging({
        obj: obj[prop],
        parentKey: [parentKey, prop].filter(Boolean).join("."),
      })
    } else {
      addLoggingToProperty({ obj, prop, parentKey })
    }
  })

  return obj
}
