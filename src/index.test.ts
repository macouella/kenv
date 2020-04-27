/* eslint-disable @typescript-eslint/naming-convention */
import _fs from "fs"
import _path from "path"
import _json5 from "json5"
import { mocked } from "ts-jest/utils"
import { config, getRedactedDump } from "."

const fs = mocked(_fs)
const path = mocked(_path)
const json5 = mocked(_json5)

jest.mock("fs")
jest.mock("path")
jest.mock("json5")

const TEST_CONFIGS = {
  "/cwd/MATCHING_ENV.jsonc": {
    hello: "whyhellothere",
    matching: 1,
  },
  "/cwd/MATCHING_SAMPLE_ENV.jsonc": {
    hello: "whyhellothere",
    matching: 1,
  },
  "/cwd/MATCHING_EXTRA_ENV.jsonc": {
    hello: "whyhellothere",
    matching: 1,
    notmatching: 1,
  },
  "/cwd/MATCHING_BADINPUT_ENV.jsonc": {
    hello: "whyhellothere",
    matching: 1,
    ".badKey": 1,
    nested: {
      okay: 1,
      ".badKey1": 1,
      "-badKey1": 1,
    },
    "okay.key": 1,
  },
  "/cwd/MATCHING_SAMPLE_BADINPUT_ENV.jsonc": {
    hello: "whyhellothere",
    matching: 1,
    ".badKey": 1,
    nested: {
      okay: 1,
      ".badKey1": 1,
      "-badKey1": 1,
    },
    "okay.key": 1,
  },
  "/cwd/MISSING_SAMPLE_ENV.jsonc": {
    hello: "whyhellothere",
  },
  "/cwd/MISSING_ENV.jsonc": {
    hello: "whyhellothere",
  },
}
const cwdSpy = jest.spyOn(process, "cwd")
const warnSpy = jest.spyOn(console, "warn")
const logSpy = jest.spyOn(console, "log")

beforeAll(() => {
  cwdSpy.mockReturnValue("/cwd")

  json5.parse.mockImplementation((obj: any) => {
    return obj
  })
  fs.existsSync.mockReturnValue(true)
  fs.readFileSync.mockImplementation(((file: keyof typeof TEST_CONFIGS) => {
    return {
      toString: () => TEST_CONFIGS[file],
    }
  }) as any)
  path.resolve.mockImplementation((...paths) => paths.join("/"))
})

beforeEach(() => {
  warnSpy.mockReset()
  logSpy.mockReset()
})

describe("config", () => {
  it("should write to process.kenv and return an object", () => {
    const result = config({
      environmentPath: "MATCHING_ENV.jsonc",
      environmentTemplatePath: "MATCHING_SAMPLE_ENV.jsonc",
      whitelistKeys: [],
    })
    const innerProperty = Object.getOwnPropertyDescriptor(
      process.kenv,
      "hello"
    )!

    expect(process.kenv).toMatchInlineSnapshot(`
      Object {
        "hello": "whyhellothere",
        "matching": 1,
      }
    `)
    expect(result).toMatchInlineSnapshot(`
      Object {
        "hello": "whyhellothere",
        "matching": 1,
      }
    `)
    expect(innerProperty.writable).toBeTruthy()
  })

  it("should freeze the process.kenv", () => {
    config({
      environmentPath: "MATCHING_ENV.jsonc",
      environmentTemplatePath: "MATCHING_SAMPLE_ENV.jsonc",
      whitelistKeys: [],
      freeze: true,
    })

    const innerProperty = Object.getOwnPropertyDescriptor(
      process.kenv,
      "hello"
    )!
    expect(innerProperty.writable).toBeFalsy()
  })

  it("should return a config object", () => {
    const fileSummary = config({
      environmentPath: "MATCHING_ENV.jsonc",
      environmentTemplatePath: "MATCHING_SAMPLE_ENV.jsonc",
      whitelistKeys: [],
    })
    expect(fileSummary).toMatchObject(TEST_CONFIGS["/cwd/MATCHING_ENV.jsonc"])
  })

  it("should warn the user if the configs do not match", () => {
    const fileSummary = config({
      environmentPath: "MATCHING_ENV.jsonc",
      environmentTemplatePath: "MISSING_SAMPLE_ENV.jsonc",
      whitelistKeys: [],
    })
    const message = warnSpy.mock.calls[0][0]
    expect(message.includes("missing keys")).toBeTruthy()
  })

  it("should throw an error when the config is enabled", () => {
    let thrownError
    try {
      config({
        environmentPath: "MATCHING_ENV.jsonc",
        environmentTemplatePath: "MISSING_SAMPLE_ENV.jsonc",
        whitelistKeys: [],
        throwOnMissingKeys: true,
      })
    } catch (e) {
      thrownError = e
    }
    expect(thrownError.message.includes("missing keys"))
  })

  it("should not warn the user against whitelisted keys", () => {
    config({
      environmentPath: "MATCHING_ENV.jsonc",
      environmentTemplatePath: "MISSING_SAMPLE_ENV.jsonc",
      whitelistKeys: ["matching"],
    })
    expect(warnSpy).toHaveBeenCalledTimes(0)
  })
  it("should cleanse bad keys and warn the user", () => {
    config({
      environmentPath: "MATCHING_BADINPUT_ENV.jsonc",
      environmentTemplatePath: "MATCHING_SAMPLE_BADINPUT_ENV.jsonc",
      whitelistKeys: [],
    })
    expect(warnSpy).toHaveBeenCalled()
    expect(process.kenv).toMatchInlineSnapshot(`
      Object {
        "hello": "whyhellothere",
        "matching": 1,
        "nested": Object {
          "okay": 1,
        },
        "okay": Object {
          "key": 1,
        },
      }
    `)
  })
  it("warns the user of missing keys from extra syncPaths", () => {
    config({
      environmentPath: "MATCHING_ENV.jsonc",
      extraSyncPaths: ["MATCHING_EXTRA_ENV.jsonc"],
      environmentTemplatePath: "MATCHING_SAMPLE_ENV.jsonc",
      whitelistKeys: [],
    })
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
  it("notifies the user when keys are used", () => {
    config({
      environmentPath: "MATCHING_ENV.jsonc",
      environmentTemplatePath: "MATCHING_SAMPLE_ENV.jsonc",
      whitelistKeys: [],
      logUsage: true,
    })

    process.kenv.hello + process.kenv.matching
    const mergedLogs = logSpy.mock.calls.map((x) => x.join("\t")).join("\n")
    expect(mergedLogs.includes("hello")).toBeTruthy()
    expect(mergedLogs.includes("matching")).toBeTruthy()
  })
})

describe("getRedactedDump", () => {
  it("should return a redacted dump", () => {
    config({
      environmentPath: "MATCHING_ENV.jsonc",
      environmentTemplatePath: "MATCHING_SAMPLE_ENV.jsonc",
    })
    const dump = getRedactedDump()
    expect(dump).toMatchInlineSnapshot(`
      Object {
        "hello": "whyh*********",
        "matching": 1,
      }
    `)
  })
  it("should hide keys from a redacted dump", () => {
    config({
      environmentPath: "MATCHING_ENV.jsonc",
      environmentTemplatePath: "MATCHING_SAMPLE_ENV.jsonc",
    })
    const dump = getRedactedDump({
      hideKeys: ["hello"],
    })
    expect(dump).toMatchInlineSnapshot(`
      Object {
        "matching": 1,
      }
    `)
  })
  it("should accept a custom object", () => {
    const dump = getRedactedDump({
      kenvironment: {
        sample: 1,
      },
    })
    expect(dump).toMatchInlineSnapshot(`
      Object {
        "sample": 1,
      }
    `)
  })
})
