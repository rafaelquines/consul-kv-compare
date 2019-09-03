import { CommanderStatic } from 'commander';
import * as Consul from 'consul';
import * as inquirer from 'inquirer';

export class ConsulKvCompare {
  cmdOptions: CommanderStatic;
  consulA!: string;
  consulAName!: string;
  consulAKeys!: string[];
  consulB!: string;
  consulBName!: string;
  consulBKeys!: string[];
  folderName!: string;
  folders!: string[];

  constructor(cmdOptions: CommanderStatic) {
    this.cmdOptions = cmdOptions;
  }

  async start() {
    await this.collectInputs();
    const confirmAAnswer = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      default: true,
      message: `Please, connect to ${this.consulAName} network. Continue?`,
    });
    if (confirmAAnswer.confirm) {
      try {
        console.log(`Reading ${this.consulAName} folders...`);
        this.folders = await this.getFolders(this.consulA);
        if(this.folders && this.folders.length > 0) {
          const folderAnswer: any = await inquirer.prompt({
            name: 'folder',
            type: 'list',
            choices: this.folders,
            message: 'Select Consul folder:',
          });
          this.folderName = folderAnswer.folder;
          this.consulAName = `Consul A [${this.consulA}/${this.folderName}]`;
          this.consulBName = `Consul B [${this.consulB}/${this.folderName}]`;
          console.log(`Reading ${this.consulAName} keys...`);
          this.consulAKeys = await this.getKeys(this.consulA, this.folderName);
          console.log(`Found ${this.consulAKeys.length} keys on ${this.consulAName}`);
          const confirmBAnswer = await inquirer.prompt({
            type: 'confirm',
            name: 'confirm',
            default: true,
            message: `Now, connect to ${this.consulBName} network. Continue?`,
          });
          if (confirmBAnswer.confirm) {
            this.consulBKeys = await this.getKeys(this.consulB, this.folderName);
            console.log(`Found ${this.consulBKeys.length} keys on ${this.consulBName}`);
            const diffA = this.consulAKeys.filter(x => !this.consulBKeys.includes(x));
            const diffB = this.consulBKeys.filter(x => !this.consulAKeys.includes(x));
            if (diffA.length === 0 && diffB.length === 0) {
              console.log('The keys are identical on both servers.');
            } else {
              if (diffA.length > 0) {
                console.log(`Some keys exist only on ${this.consulAName}: `);
                console.log(diffA);
              }
              if (diffB.length > 0) {
                console.log(`Some keys exist only on ${this.consulAName}: `);
                console.log(diffB);
              }
              console.log('------------------------------');
              if (diffA && diffA.length > 0) {
                let questionMsg = `Would you like to add new keys to ${this.consulBName}?`;
                questionMsg += `\nNOTE: You will need to set the values later.`;
                const confirmSyncAnswer = await inquirer.prompt({
                  type: 'confirm',
                  name: 'confirmSync',
                  message: questionMsg,
                });
                if (confirmSyncAnswer.confirmSync) {
                  await this.saveKeys(this.consulB, this.folderName, diffA);
                  console.log(`Keys successfully added on ${this.consulBName}.`);
                }
              }
              process.exit(0);
            }
          } else {
            process.exit(0);
          }
        } else {
          console.log(`Error: No folders found.`);
          process.exit(0);
        }
      } catch (ex) {
        console.log(`Error: ${ex.statusCode ? ex.statusCode + ' - ' : ''}${ex.message}`);
      }
    } else {
      process.exit(0);
    }
  }

  async collectInputs() {
    this.consulA = this.cmdOptions.consulA;
    this.consulB = this.cmdOptions.consulB;
    this.folderName = this.cmdOptions.folderName;

    // Consul A
    if (!this.consulA) {
      const consulAAnswer: any = await inquirer.prompt({
        name: 'consulA',
        message: 'Consul Server A:',
        validate: inp => this.validateRequired(inp),
      });
      this.consulA = this.normalizeUrl(consulAAnswer.consulA);
    }

    // Consul B
    if (!this.consulB) {
      const consulBAnswer: any = await inquirer.prompt({
        name: 'consulB',
        type: 'input',
        message: 'Consul Server B:',
        validate: inp => this.validateRequiredAndUnique(inp, this.consulA),
      });
      this.consulB = this.normalizeUrl(consulBAnswer.consulB);
    }
    this.consulAName = `Consul A [${this.consulA}]`;
    this.consulBName = `Consul B [${this.consulB}]`;
  }

  private normalizeUrl(url: string) {
    url = url.startsWith('http://') ? url.substr('http://'.length) : url;
    url = url.startsWith('https://') ? url.substr('https://'.length) : url;
    url = url.indexOf('/') !== -1 ? url.substr(0, url.indexOf('/')) : url;
    return url;
  }

  private async getKeys(consulUrl: string, folderName: string) {
    const consulClient = await this.connect(consulUrl);
    const keys = await consulClient.kv.keys<string[]>(`${folderName}/`);
    const retKeys = [];
    for (const key of keys) {
      if (key === `${folderName}/`) {
        continue;
      }
      retKeys.push(key.substr(key.indexOf('/') + 1));
    }
    return retKeys.sort();
  }

  private async getFolders(consulUrl: string) {
    const consulClient = await this.connect(consulUrl);
    const keys = await consulClient.kv.keys<string[]>();
    const retKeys = [];
    for (const key of keys) {
      if (key.endsWith('/')) {
        retKeys.push(key.substr(0, key.indexOf('/')));
      }
      continue;
    }
    return retKeys.sort();
  }

  private async connect(consulUrl: string) {
    let port = undefined;
    if (consulUrl.indexOf(':') !== -1) {
      const parts = consulUrl.split(':');
      consulUrl = parts[0];
      port = parts[1];
    }
    return new Consul({
      host: consulUrl,
      port,
      promisify: true,
    });
  }

  private async saveKeys(consulUrl: string, folderName: string, keys: string[]) {
    if (keys && keys.length > 0) {
      const consulClient = await this.connect(consulUrl);
      for (const key of keys) {
        await consulClient.kv.set(`${folderName}/${key}`, '');
      }
    }
  }

  private validateRequired(value: string) {
    return value ? true : 'Invalid';
  }

  private validateRequiredAndUnique(value: string, previousValue: string) {
    return value && value !== previousValue ? true : 'Invalid';
  }
}
