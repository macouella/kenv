# Kenv

> Load whole and nested json objects into your process.env at ease. `process.kenv.nowThis?.isPossible!`

Kenv was designed with these in mind:

- Lessen the burden on developers to keep local and deployed environment variables in sync.
- Provide a simple yet flexible way of specifying environment variables with
  support for primitives, nested structures (a.k.a. json-like).

Kenv loads json and jsonc (json with comments) files into a unique `process.kenv` property.
Kenv also reports variations between your config files to help you keep them in sync.
Supports node and webpack environment loading.

## Usage

```sh
# install
[yarn add/npm i --save] kenv

# prepare the config files
echo '{"sample":1}' > ./.kenv.json # a development-only config
echo '{"sample":1}' > ./.kenv.sample.json # sample config committed to source
```

Then chuck it at the top of your node/typescript entrypoint.

```javascript
// sample.js
require("kenv").config({
  // all configurations are optional
  environmentPath: '.kenv.json', // the main json/c file to load
  environmentTemplatePath = '.kenv.sample.json', // a git-commitable sample file
  extraSyncPaths = ['.kenv.production.json', '.kenv.staging.json'] // extra environment config files to validate against
  whitelistKeys = [], // keys to skip validation
  throwOnMissingKeys: false, // throw err instead of console.warn when keys are missing.
  freeze: false // makes the contents of process.kenv readonly. false by default.
})

// or
import { config } from kenv
config({})

// then anywhere else in your code
console.log(process.kenv.variable.to.access)
```

- Note that config() also returns the loaded json object.
- For jsonc support in your editor, ensure that you're loading the json in jsonc
  syntax.

## Usage with webpack

To use `process.kenv` in webpack-based environments, you may use the
`getDefinePluginConfig` helper and pass it to `webpack.definePlugin`:

```javascript
require("kenv").config()
const { getDefinePluginConfig } = require("kenv/webpack")
const { DefinePlugin } = require("webpack")

// then in your webpack configurations:
config.plugins.push(
  new DefinePlugin({
    "process.kenv": getDefinePluginConfig(
      process.kenv, // the loaded process.kenv
      ["list", "of", "blacklisted", "keys"] // list of keys that won't be published to webpack
    ),
  })
)

// then anywhere else in your webpack-based js/ts code
console.log(process.kenv.some.environment.variable)
```

Use `getDefinePluginConfig` to define and control which environment
variables to publish to webpack. This is useful if you wish to hide certain
keys from compile-time, client-side and server-side configs.

## Adding typescript intellisense for your kenv variables

Add a similar d.ts file to your root:

```typescript
// global.d.ts
import kenvVariables from "./.kenv.sample.json"

declare global {
  namespace NodeJS {
    interface Process {
      kenv: typeof kenvVariables
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
```

## The two dependencies

Kenv uses `json5` to parse Jsonc and Json files. Kenv also uses `flat` to
preprocess `webpack.DefinePlugin` configs. When enabled, `deep-freeze`is used to
make the process.kenv unwritable.

## Why name it kenv?

The keystrokes feel natural (try typing `process.kenv.variable`), the name is as
short and meaningful as possible, and kenv is an available package name from npm.

## Inspiration

- dotenv
- yenv
- process.env

## Other projects

[Linkdash](https://github.com/igimanaloto/linkdash) - Generate a handy dashboard of links in seconds.
