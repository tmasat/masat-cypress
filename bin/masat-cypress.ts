#!/usr/bin/env node

import { createCLI } from '../src/cli/run';

const program = createCLI();
program.parse(process.argv);
