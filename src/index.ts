#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import * as semver from 'semver';

const config: Config = require('rc')('license');

const dir = process.cwd();

let packageLock: PackagLock;
try {
  packageLock = JSON.parse(
    fs.readFileSync(path.join(dir, 'package-lock.json')).toString(),
  );
} catch (err) {
  console.error('Cannot find package-lock.json');
  console.error('Please install dependencies using the latest version of npm');
  process.exit(1);
}

getLicenses().then(dependencies => {
  const licenses = dependencies.reduce(
    (acc, dependency) => ({
      ...acc,
      [`${dependency.id}@@${dependency.version}`]: {
        dev: dependency.dev,
        licence: dependency.license,
      },
    }),
    {},
  );

  const sorted = Object.keys(licenses)
    .map(key => {
      const parts = key.split('@@');

      return {
        id: parts[0],
        version: parts[1],
        dev: licenses[key].dev,
        license: licenses[key].licence,
      };
    })
    .sort((a, b) => {
      if (a.id === b.id) {
        return semver.lt(a.version, b.version) ? -1 : 1;
      } else {
        return a.id.localeCompare(b.id);
      }
    });

  const keys = sorted.length ? Object.keys(sorted[0]) : [];

  let output = keys.map(key => `"${key}"`).join() + os.EOL;

  for (const dependency of sorted) {
    output += keys
      .map(
        key =>
          key === 'dev' ? `"${!!dependency[key]}"` : `"${dependency[key]}"`,
      )
      .join();
    output += os.EOL;
  }

  fs.writeFileSync(path.join(dir, config.output || 'license-scan.csv'), output);

  const undef = sorted.filter(d => !d.license || d.license === 'undefined');

  if (undef.length) {
    console.error(
      `Licenses could not be found for ${undef.length} package${
        undef.length === 1 ? '' : 's'
      }:`,
    );
    console.error(undef.map(d => `${d.id}@${d.version}`).join(', '));
    process.exit(1);
  }

  if (config.whitelist) {
    const wl = new Set(config.whitelist);
    const fail = sorted.filter(d => !wl.has(d.license));
    if (fail.length) {
      console.error(
        `The licenses for the following package versions have not been whitelisted:`,
      );
      fail.forEach(d => console.error(`${d.id}@${d.version} => ${d.license}`));
      process.exit(1);
    }
  } else if (config.blacklist) {
    const bl = new Set(config.blacklist);
    const fail = sorted.filter(d => bl.has(d.license));
    if (fail.length) {
      console.error(
        `The licenses for the following package versions have been blacklisted:`,
      );
      fail.forEach(d => console.error(`${d.id}@${d.version} => ${d.license}`));
      process.exit(1);
    }
  }
});

async function getLicenses(): Promise<Dependency[]> {
  const result: Dependency[] = [];

  for await (const dependency of readLicenses(
    traversePackages(packageLock.dependencies),
  )) {
    result.push(dependency);
  }

  return result;
}

async function getLicense(dependency: Dependency): Promise<string> {
  const filename = path.join(
    dir,
    'node_modules',
    ...dependency.ancestors.map(ancestor =>
      path.join(...ancestor.split('/'), 'node_modules'),
    ),
    ...dependency.id.split('/'),
    'package.json',
  );

  return new Promise<string>((resolve, reject) => {
    fs.readFile(filename, (err, data) => {
      if (err) {
        console.error(`Cannot read file ${filename}`);
        console.error(
          'Please run "npm ci" to ensure that all dependencies are installed',
        );
        process.exit(1);
      } else {
        try {
          const obj = JSON.parse(data.toString());

          if (obj.license) {
            resolve(obj.license.type || obj.license);
          } else if (obj.licenses && Array.isArray(obj.licenses)) {
            resolve(
              obj.licenses.map(license => license.type || license).join(),
            );
          } else if (config.defaults) {
            resolve(config.defaults[`${dependency.id}@${dependency.version}`]);
          } else {
            resolve(undefined);
          }
        } catch (err) {
          reject(err);
        }
      }
    });
  });
}

async function* readLicenses(
  dependencies: IterableIterator<Dependency>,
): AsyncIterableIterator<Dependency> {
  for (const dependency of dependencies) {
    yield new Promise<Dependency>(async (resolve, reject) => {
      resolve({ ...dependency, license: await getLicense(dependency) });
    });
  }
}

function* traversePackages(
  dependencies: Dependencies,
  ancestors: string[] = [],
): IterableIterator<Dependency> {
  for (const id in dependencies) {
    const dependency = dependencies[id];
    const { version, dev } = dependency;
    yield { id, version, dev, ancestors };

    if (dependency.dependencies) {
      yield* traversePackages(dependency.dependencies, [...ancestors, id]);
    }
  }
}

type Dependency = {
  id: string;
  ancestors: string[];
  version: string;
  dev: boolean;
  license?: string;
};

type PackagLock = {
  name: string;
  version: string;
  lockfileVersion: number;
  requires: boolean;
  dependencies?: Dependencies;
};

type Package = {
  version: string;
  resolved?: string;
  integrity?: string;
  dev: boolean;
  requires?: { [id: string]: string };
  dependencies?: Dependencies;
};

type Dependencies = { [id: string]: Package };

type Config = {
  whitelist?: string[];
  blacklist?: string[];
  defaults?: { [packageId: string]: string };
  output?: string;
};
