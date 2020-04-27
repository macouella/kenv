# Kenv

> Treat environment variables like json objects. `process.kenv.nowThis?.isPossible!`

- Easily manage and consolidate app secrets through a flexible environment configuration.
- Support nested configuration objects. (For example, [Google Cloud Platform](https://cloud.google.com/docs/authentication/production) uses
  service-account json files for server-server authentication.)
- Support primitive types. `process.kenv.BOOLEAN_VALUE === true`.
- Validate syncing between your local, sample and production config files.
- Get a real-time view of how environment variables are used in your system.
- Introduce typescript intellisense to effectively locate and use environment variables.

Kenv loads a json or jsonc (json with comments) file into a unique
`process.kenv` property. Kenv supports node, typescript and webpack client/server.

## Usage

```sh
# install
yarn add kenv
# [or]
npm i --save kenv

# prepare the two config files that kenv requires
echo '{"TEST_KEY":{"INNER_KEY":true}}' > ./.kenv.json # development-only config
echo '{"TEST_KEY":{"INNER_KEY":true}}' > ./.kenv.sample.json # sample config committed to source
```

Then load `kenv` at the top of your node/typescript entrypoint.

```javascript
// sample.js
require("kenv").config({
  // all configurations are optional
  environmentPath: '.kenv.json', // the main jsonc file to load
  environmentTemplatePath = '.kenv.sample.json', // template file to validate syncing
  whitelistKeys = [], // keys to ignore for validation
  throwOnMissingKeys: false, // exit with an error instead of a console.warn when keys are out of sync  (default: false)
  devSyncPaths = ['.kenv.production.json', '.kenv.staging.json'] // extra config files to validate syncing during development
  freeze: false, // makes process.kenv readonly (default: false)
  logUsage: false, // logs usage of environment keys on the console (default: false)
})

// or
import { config } from kenv
config()

// then anywhere else in your code
console.log(process.kenv.TEST_KEY.INNER_KEY) // logs true
```

- config() also returns the loaded json object.
- inline comments are supported in json files.
- nested object access is case-sensitive.
- use `devSyncPaths` while developing to ensure that the different config
  files are in sync.

## The logUsage option

`logUsage` enables environment key usage logging. This is useful to find out
which scripts are calling process.kenv variables. A sample output follows:

```sh
[kenv] SPECIAL_ENV_KEY                                      xxx3343-f3*********
       /path/to/the/script/index.js:22:15
```

We recommend only enabling this in dev environments as it requires stack
tracing to gather information.

## Usage with webpack

To use `process.kenv` in webpack scripts, use the `getDefinePluginConfig` to configure `webpack.definePlugin`:

```javascript
const { getDefinePluginConfig, config } = require("kenv")
const { DefinePlugin } = require("webpack")

config()

// then in your webpack configurations:
webpackConfig.plugins.push(
  new DefinePlugin({
    "process.kenv": getDefinePluginConfig(
      process.kenv, // the loaded process.kenv
      ["list", "of.blacklisted.keys"] // list of keys that won't be published to webpack (case-sensitive)
    ),
  })
)

// then anywhere else in your webpack-based js/ts code
console.log(process.kenv.some.environment.variable)
```

- Use `getDefinePluginConfig` to define and control which environment
  variables to publish to webpack. This is useful if you wish to hide certain
  keys in compile-time, client-side and server-side environments.

## Logging environment variables safely to the console

Kenv provides a `getRedactedDump` helper to safely expose an
environment dump to the console. This is useful for deployment debugging.

```javascript
const { config, getRedactedDump } = require("kenv")

config()

const redactedKenvDump = getRedactedDump({
  // all configurations are optional
  kenvironment: process.kenv, // specify an object, defaults to `process.kenv`
  decimalPercentageToShow: 0.3, // the amount to mask relative to the size of the string
  truncateLength: 20, // truncates values to the specified character length
  hideKeys: ["keys.to.hide"], // explicitly prevents showing these keys
})

// Dumps to the console, with double-space formatting.
console.log(JSON.stringify(redactedKenvDump, null, 2))

// Example output:
{
  "A.NESTED.SECRET": "abc********",
  "BOOLEAN_RULE": true,
  "NUMBER_KEY": 25.00,
  "A_LONG_NUMBER": 231231204293
}
```

## Adding typescript intellisense for your kenv variables

Add a similar typescript declaration file to your root:

```typescript
// kenv.d.ts
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

## FAQs

### Why does kenv require creating a new process property?

`process.env` is reserved for string-only variables. By creating a new global
process property, we can specify our own environment structure.

### Should I completely replace process.env with process.kenv?

Cloud hosting services have different ways to set .env variables. It is left to
the user to use .kenv solely or in combination with .env.

### How can I use kenv with cli-based applications?

We recommend creating a patched bin/cli file in your home directory, e.g.

```sh
touch my-cli-override.js;
chmod +x ./my-cli-override.js
```

```javascript
// my-cli-override.js
require("kenv").config()
require("cli/to/override.js")
```

```json
// package.json
{
  "scripts": {
    "start": "./my-cli-override.js start"
  }
}
```

### What does kenv use for its dependencies?

Kenv uses `json5` to parse Jsonc and Json files, `flat` to
preprocess `webpack.DefinePlugin` configs, `deep-freeze` to
make process.kenv contents `readonly`, and `colors` to add color to the
console outputs.

### Can you recommend a single-config environment workflow?

- Create environment specific .kenv configurations.
  - .kenv.sample.json for developer reference
  - .kenv.json for local development
  - .kenv.production.json for deployed apps
  - make sure you gitignore everything apart from the sample file.
- Publish your environment-specific configs to [AWS](https://docs.aws.amazon.com/secretsmanager/) or [Google
  Cloud](https://cloud.google.com/secret-manager) Secrets Manager. Other options include
  AWS parameter store and AWS/Google KMS.
- Use [AWS CodeDeploy](https://aws.amazon.com/codedeploy/) or [GCP
  Cloudbuild](https://cloud.google.com/cloud-build) to decrypt and dump the
  secrets into a .kenv.json file prior to building or starting your app.

## Inspiration

- dotenv
- yenv
- process.env

## Other projects

[Linkdash](https://github.com/igimanaloto/linkdash) - Generate a handy dashboard of links in seconds.
