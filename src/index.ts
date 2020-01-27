#!/usr/bin/env node
import { ConsulKvCompare } from './consul-kv-compare';
import * as commander from 'commander';

commander
  .version('1.0.0', '-v, --version')
  .option('-a, --consulA <url>', 'URL Consul Server A')
  .option('-b, --consulB <url>', 'URL Consul Server B')
  .option('-f, --folderName <folderName>', 'Consul Folder Name')
  .option('-d, --folderNameB <destinationFolderName>', 'Consul B Folder Name')
  .parse(process.argv);
const consulKvCompare = new ConsulKvCompare(commander);
consulKvCompare.start();
