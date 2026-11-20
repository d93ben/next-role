#!/usr/bin/env node
import { runCareer } from './cli.mjs';

try {
  console.log(runCareer(process.argv.slice(2)));
} catch (error) {
  console.error('Next Role: ' + error.message);
  process.exitCode = 1;
}
