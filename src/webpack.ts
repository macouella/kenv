import { unflatten, flatten } from "flat"

/**
 * Cleanses a given object and outputs a webpack.DefinePlugin
 * configuration.
 * @param kenvironment - an object to serialize
 */
const getDefinePluginConfig = <T extends Record<string, any>>(
  kenvironment: T,
  blacklist: Array<string> = []
): T => {
  const flattened = flatten(kenvironment) as Record<string, any>
  const toDefine = Object.entries(flattened).reduce((acc, [key, value]) => {
    if (!blacklist.includes(key)) {
      if (typeof value === "number" || typeof value === "boolean") {
        acc[key] = value
      } else {
        acc[key] = JSON.stringify(value)
      }
    }
    return acc
  }, {} as Record<string, boolean | number | string | object | any[]>)
  const unflattened = unflatten(toDefine) as T
  return unflattened
}

export default getDefinePluginConfig
