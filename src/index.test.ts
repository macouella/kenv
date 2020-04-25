/* eslint-disable @typescript-eslint/naming-convention */
import _fs from "fs"
import _path from "path"
import _json5 from "json5"
import { mocked } from "ts-jest/utils"
import { config } from "."

const fs = mocked(_fs)
const path = mocked(_path)
const json5 = mocked(_json5)

jest.mock("fs")
jest.mock("path")
jest.mock("json5")

const ORIGINAL_ENV = { ...process.env }

const TEST_CONFIGS = {
  "/cwd/MATCHING_ENV.jsonc": {
    hello: 1,
    matching: 1,
  },
  "/cwd/MATCHING_SAMPLE_ENV.jsonc": {
    hello: 1,
    matching: 1,
  },
  "/cwd/MATCHING_EXTRA_ENV.jsonc": {
    hello: 1,
    matching: 1,
    notmatching: 1,
  },
  "/cwd/MATCHING_BADINPUT_ENV.jsonc": {
    hello: 1,
    matching: 1,
    ".badKey": 1,
  },
  "/cwd/MATCHING_SAMPLE_BADINPUT_ENV.jsonc": {
    hello: 1,
    matching: 1,
    ".badKey": 1,
  },
  "/cwd/MISSING_SAMPLE_ENV.jsonc": {
    hello: 1,
  },
  "/cwd/MISSING_ENV.jsonc": {
    hello: 1,
  },
}
const cwdSpy = jest.spyOn(process, "cwd")
const warnSpy = jest.spyOn(console, "warn")

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
  Object.assign(process.env, ORIGINAL_ENV)
})

describe("config", () => {
  it("should write to process.kenv", () => {
    config({
      environmentPath: "MATCHING_ENV.jsonc",
      environmentTemplatePath: "MATCHING_SAMPLE_ENV.jsonc",
      whitelistKeys: [],
    })
    expect(process.kenv.hello).toEqual(1)
    expect(process.kenv.matching).toEqual(1)
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

  it("should not check against whitelisted keys", () => {
    config({
      environmentPath: "MATCHING_ENV.jsonc",
      environmentTemplatePath: "MISSING_SAMPLE_ENV.jsonc",
      whitelistKeys: ["matching"],
    })
    expect(warnSpy).toHaveBeenCalledTimes(0)
  })
  it("should cleanse invalid keys", () => {
    config({
      environmentPath: "MATCHING_BADINPUT_ENV.jsonc",
      environmentTemplatePath: "MATCHING_SAMPLE_BADINPUT_ENV.jsonc",
      whitelistKeys: [],
    })
    expect(warnSpy).toHaveBeenCalled()
    expect(process.kenv).toMatchInlineSnapshot(`
      Object {
        "hello": 1,
        "matching": 1,
      }
    `)
  })
  it("should check extra environment config files", () => {
    config({
      environmentPath: "MATCHING_ENV.jsonc",
      extraSyncPaths: ["MATCHING_EXTRA_ENV.jsonc"],
      environmentTemplatePath: "MATCHING_SAMPLE_ENV.jsonc",
      whitelistKeys: [],
    })
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})
