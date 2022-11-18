import fs from 'node:fs/promises'
import { rename, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

// Returns a temporary file
// Example: for /some/file will return /some/.file.tmp
function getTempFilename(file: string): string {
  return join(dirname(file), '.' + basename(file) + '.tmp')
}

type Resolve = () => void
type Reject = (error: Error) => void

export class Writer {
  #filename: string
  #tempFilename: string
  #locked = false
  #prev: [Resolve, Reject] | null = null
  #next: [Resolve, Reject] | null = null
  #nextPromise: Promise<void> | null = null
  #nextData: string | null = null

  // File is locked, add data for later
  #add(data: string): Promise<void> {
    // Only keep most recent data
    this.#nextData = data

    // Create a singleton promise to resolve all next promises once next data is written
    this.#nextPromise ||= new Promise((resolve, reject) => {
      this.#next = [resolve, reject]
    })

    // Return a promise that will resolve at the same time as next promise
    return new Promise((resolve, reject) => {
      this.#nextPromise?.then(resolve).catch(reject)
    })
  }

  // File isn't locked, write data
  async #write(data: string): Promise<void> {
    // Lock file
    this.#locked = true
    try {
      // Atomic write
      await writeFile(this.#tempFilename, data, 'utf-8')
      await rename(this.#tempFilename, this.#filename)

      // Call resolve
      this.#prev?.[0]()
    } catch (err) {
      // Call reject
      if (err instanceof Error) {
        this.#prev?.[1](err)
      }
      throw err
    } finally {
      // Unlock file
      this.#locked = false

      this.#prev = this.#next
      this.#next = this.#nextPromise = null

      if (this.#nextData !== null) {
        const nextData = this.#nextData
        this.#nextData = null
        await this.write(nextData)
      }
    }
  }

  constructor(filename: string) {
    this.#filename = filename
    this.#tempFilename = getTempFilename(filename)
  }

  async write(data: string): Promise<void> {
    return this.#locked ? this.#add(data) : this.#write(data)
  }
}

export const writeJSON = <T extends Object>(obj: T, filePath: string) => {
    const json = JSON.stringify(obj);
    return new Writer(filePath).write(json);
};

export const readJSON = async (filePath: string) => {
    try {
        return await fs.readFile(filePath, 'utf-8');
    } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }
        throw e;
    }
}
