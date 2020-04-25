# Kenv

> Load objects into your environment, not just string variables `process.kenv.nowThis?.is?.possible!`

Kenv loads environment variables from json and jsonc (json with comments) config files.

## Demo

![Kenv demo](https://raw.githubusercontent.com/igimanaloto/kenv/master/readme_assets/demo.gif)

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
  // all configurations are optionsl
  environmentPath: '.kenv.json', // the main json/c file to load
  sampleEnvironmentPath = '.kenv.sample.json', // sample file to load in source
  whitelistKeys = [], // keys to skip validation
  throwOnMissingKeys: false // throw err instead of console.warn when keys are missing.
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
    "process.kenv": getDefinePluginConfig(process.kenv, ["list", "of", "blacklisted", "keys]),
  })
)

// then anywhere else in your webpack-based js/ts code
console.log(process.kenv.some.environment.variable)
```

Kenv exposes this helper as opposed to having a full pledged webpack plugin to
keep maintainance simple. `getDefinePluginConfig` also accepts a list of keys to
blacklist. This is useful if you wish to hide certain keys on the server and the
client. An example is `next.js` which runs two sets of `webpack` configs.

## The painpoints of traditional dotenv loading

- Popular solutions like dotenv and yenv load flat variable structures. There is
  a lack of primitive types (boolean, string, number) support and JSON.parse is often
  used to convert a stringified objects for javascript use.
- Therein lies a complexity in managing and syncing app secrets. (One separate cryptographically signed file per loaded json).
- process.env is reserved primarily for strings. (It's bad assinging process.env with a malicious getter function!)
- .sample.env files are regarded as a config source of truth, yet they lack syncing or validation.

## How kenv solves these problems

- kenv parses and loads json settings into a global process.kenv object.
- kenv also enforces config validation checks. You specify a template
  (.kenv.sample.json) and you'll see simple log warnings when your
  development-only config falls out of sync. (you may also toggle error throwing
  if that suits)

Using Jsonc presents a few other benefits:

- Jsonc allows you to specify object-like environment structures,
  primitive types (booleans, strings and numbers) and comments.
- Compile-time catching so you know how to react when a json file is misconfigured.
- Achieve intellisense-enabled configs, through [https://json-schema.org/](JSON
  Schema) which allows annotation of JSON documents.

Apart from that, we also gain a huge win by being able to use optional chaining.

## Adding typescript intellisense for your kenv variables

If you wish to achieve type-intellisense, add a similar d.ts file to your root.

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

Jsonc requires a different kind of parser, so we're using `json5` for that. This
also means that there is json5 support. As for supporting webpack, we use
`flat` to preprocess environment keys for `webpack.DefinePlugin` consumption.

## Why name it kenv?

The keystrokes feel natural (try typing `process.kenv.variable`), the name is as short as meaningfully possible, and
kenv is an available package name from npm.

## Inspiration

- dotenv
- yenv
- process.env

## Other projects

[Linkdash](https://github.com/igimanaloto/linkdash) - Generate a handy dashboard of links in seconds.
