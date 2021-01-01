import getDefinePluginConfig from "./webpack"

describe("getDefinePluginConfig", () => {
  it("should json-escape properly", () => {
    const result = getDefinePluginConfig({
      kenvironment: {
        a: 1,
        d: true,
        f: {
          x: {
            z: "hello",
          },
        },
      },
    })

    expect(result).toMatchInlineSnapshot(`
      Object {
        "a": 1,
        "d": true,
        "f": Object {
          "x": Object {
            "z": "\\"hello\\"",
          },
        },
      }
    `)
  })

  it("should whitelist keys", () => {
    const result = getDefinePluginConfig({
      kenvironment: {
        a: 1,
        blacklistedKey: 1,
        inner: {
          blackListedKey: 1,
        },
      },
      hideKeys: ["blacklistedKey", "inner.blackListedKey"],
    })

    expect(result).toMatchInlineSnapshot(`
      Object {
        "a": 1,
      }
    `)
  })
})
