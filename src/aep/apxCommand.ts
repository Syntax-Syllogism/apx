import { SfCommand } from '@salesforce/sf-plugins-core';
import { toCliError } from './errors.js';

export abstract class ApxCommand<T> extends SfCommand<T> {
  protected async catch(error: Error): Promise<never> {
    return super.catch(toCliError(error));
  }
}
