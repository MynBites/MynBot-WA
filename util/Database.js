import { join } from 'path'
import fs from 'fs'

export class Database {
  constructor(folder, DEFAULT = {}) {
    this._data = { ...DEFAULT, ...data }
    this._folder = folder
  }

  get(name) {
    let folder = join(this._folder, name)
    fs.readFileSync(folder)
    const self = this
    const proxy = new Proxy(obj, {
      get(target, prop, receiver) {
        const value = self.get(join(name, prop));
        if (value instanceof Function) {
          return function (...args) {
            return value.apply(this === receiver ? target : this, args);
          };
        }
        return value;
      },
      set(target, prop, receiver) {
        const value = self.get(join(name, prop));
        if (value instanceof Function) {
          return function (...args) {
            return value.apply(this === receiver ? target : this, args);
          };
        }
        return value;
      },
    })
  }
}
