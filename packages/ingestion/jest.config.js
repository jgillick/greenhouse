module.exports = {
  preset: "ts-jest",
  rootDir: "./src",
  clearMocks: true,
  resetMocks: true,
  collectCoverage: false,
  coveragePathIgnorePatterns: ["/node_modules/"],
  coverageProvider: "v8",
  coverageDirectory: "../coverage",

  // The maximum amount of workers used to run your tests. Can be specified as % or a number. E.g. maxWorkers: 10% will use 10% of your CPU amount + 1 as the maximum worker number. maxWorkers: 2 will use a maximum of 2 workers.
  maxWorkers: "50%",

  // The glob patterns Jest uses to detect test files
  testMatch: ["**/?(*.)+(test).[tj]s?(x)"],

  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: ["/node_modules/"],
};
