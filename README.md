# License Scan

Automatically scan the licenses of your project and its dependencies

## Quick start

1.  Install from npm: `npm install -g license-scan`
1.  Navigate your project directory
1.  Scan licenses: `license-scan`

This will create a `license-scan.csv` file in the root of your repo that contains all of the packages versions and their respective licenses. You will likely want to commit this file to source control so that you can track when new licenses are added to your project's dependency tree.

Note that this tool reads from `package-lock.json` as well as from `node_modules`. For the best experience, please ensure that you are running the latest version of `npm` and have recently run `npm ci`.

## Configuration

You can configure the scan by adding a `.licenserc` file that contains `json` formatted data. The scan will look for this config file in the current directory, any of its parent directories, or any other place that "rc" files are normally stored.

### Whitelist

You can add an array of licenses in the optional `whitelist` property. If the `whitelist` property is present, then any package version with a license NOT in the whitelist will cause the scan to exit with a non-zero code. The `.csv` output file will be generated even if the file exits with a non-zero code. Note that licenses are evalated by exact case-sensitive string matching. If the `whitelist` property is present then the optional `blacklist` property is ignored.

Example:

```json
{
  "whitelist": [
    "BSD",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "BSD-3-Clause OR MIT",
    "MIT"
  ]
}
```

### Blacklist

If a `whitelist` is not specified, then you can add an array of licenses to the optional `blacklist` property. Any package version with a license in the blacklist will cause the scan to exit with a non-zero code. The `.csv` output file will be generated even if the file exits with a non-zero code. Note that licenses are evalated by exact case-sensitive string matching. If the `whitelist` property is present then the optional `blacklist` property is ignored.

Example:

```json
{
  "blacklist": ["GPL", "GPL-2.0"]
}
```

### Defaults

This scan looks at the `package.json` files to determine the license for the particular package version. Occasionally packages do not disclose their licenses in this way. You can add an optional `defaults` property that provides the license for a specific version of a package. Note that if the `package.json` for the specific package version DOES include the license, then this value is ignored. If a dependecy does not disclose its license via the `package.json` file or the `defaults` property, then the scan will exit with a non-zero code.

Example:

```json
{
  "defaults": {
    "indexof@0.0.1": "MIT"
  }
}
```

### Output

A different output file can be specified with the optional `output` property. If this property is not set, then the default `license-scan.csv` is used.

Example:

```json
{
  "output": "package-licenses.csv"
}
```

## How to:

### Build and run from source

1.  Build the code: `npm run build`
1.  Run it! `npm start`

## Disclaimer

Software licensing can be complicated. The examples used in this project do not endorse or discourage the use of any license. Use of this tool does not constitute legal advice or legal services.
