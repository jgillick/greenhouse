import "jest";
import { LocalCache } from "./LocalCache";
import { cache as cacheDecorator } from "./decorator";

describe("cache decorator", () => {
  let cacheStore: LocalCache;
  let decoratorFn: ReturnType<typeof cacheDecorator>;
  let targetFn: jest.Mock;
  let descriptor: { value: (...args: unknown[]) => void };

  beforeEach(() => {
    cacheStore = new LocalCache(10);
    decoratorFn = cacheDecorator(cacheStore);
    targetFn = jest.fn().mockResolvedValue("test function");

    descriptor = {
      value: targetFn,
    };
  });

  test("call wrapped function", async () => {
    cacheStore.has = jest.fn().mockResolvedValue(false);
    decoratorFn(null, "methodName", descriptor);
    await descriptor.value();
    expect(targetFn).toBeCalled();
  });

  test("serialize arguments", async () => {
    cacheStore.has = jest.fn().mockResolvedValue(false);
    cacheStore.get = jest.fn().mockResolvedValue(undefined);
    decoratorFn(null, "methodName", descriptor);

    await descriptor.value("foo", false, 123.45, { prop: "value" }, [
      "one",
      "two",
    ]);
    expect(cacheStore.has).toBeCalledWith(
      'Object.methodName#foo,false,123.45,{"prop":"value"},["one","two"]'
    );
  });

  test("method decorator with no descriptor", async () => {
    const testMethodFn = jest.fn().mockResolvedValue("test");
    class MyClass {
      testMethod = testMethodFn;
    }
    const instance = new MyClass();
    cacheStore.has = jest.fn().mockResolvedValue(false);
    cacheStore.get = jest.fn().mockResolvedValue(undefined);

    decoratorFn(instance, "testMethod");

    await instance.testMethod("foo");
    expect(testMethodFn).toBeCalled();
    expect(cacheStore.has).toBeCalledWith("MyClass.testMethod#foo");
  });

  test("when cache found, do not call wrapped function", async () => {
    cacheStore.has = jest.fn().mockResolvedValue(true);
    cacheStore.get = jest.fn().mockResolvedValue("test");
    decoratorFn(null, "methodName", descriptor);

    const result = await descriptor.value();
    expect(targetFn).not.toBeCalled();
    expect(result).toBe("test");
  });

  test("on cache error, call wrapped function", async () => {
    cacheStore.has = jest.fn().mockResolvedValue(true);
    cacheStore.get = jest.fn().mockRejectedValue(new Error("ERROR"));
    decoratorFn(null, "methodName", descriptor);

    const result = await descriptor.value();
    expect(targetFn).toBeCalled();
    expect(result).toBe("test function");
  });

  test("static method/function decorator", async () => {
    cacheStore.has = jest.fn().mockResolvedValue(false);
    cacheStore.get = jest.fn().mockResolvedValue("test");

    const wrappedFn = decoratorFn(targetFn, { name: "funcName" });

    await wrappedFn("foo");
    expect(targetFn).toBeCalled();
    expect(cacheStore.has).toBeCalledWith("Object.funcName#foo");
  });
});
