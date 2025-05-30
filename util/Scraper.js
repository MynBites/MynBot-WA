import { promises, unlinkSync, readFileSync, writeFileSync, createReadStream, createWriteStream } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { tmpdir } from 'os'
import { gotScraping } from 'got-scraping'
import { CookieJar } from 'tough-cookie'

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function log(...args) {
    console.log('\x1b[42mLOG\x1b[49m \x1b[33m%s\x1b[39m\n', new Date(), ...args)
}

export const CONSTANT = {
    mimetype: {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        'image/png': 'image/png',
        'image/jpg': 'image/jpeg',
        'image/jpeg': 'image/jpeg',
        'image/webp': 'image/webl'
    }
}

export class TempFile {
	constructor(ext) {
		this.filename = randomBytes(16).toString('hex') + (ext ? '.' + ext : '')
	}

    get path() {
        return join(tmpdir(), this.filename)
    }

    createWriteStream(/** @type {Parameters<createWriteStream>[1]} */ options) {
        return createWriteStream(this.path, options)
    }

    createReadStream(/** @type {Parameters<createReadStream>[1]} */options) {
        return createReadStream(this.path, options)
    }

    async write(input) {
        if (!input || !Buffer.isBuffer(input)) throw new Error('No Buffer is Found')
        return promises.writeFile(this.path, buffer)
    }

    writeSync(input) {
        if (!input || !Buffer.isBuffer(input)) throw new Error('No Buffer is Found')
        writeFileSync(this.path, buffer)
    }

	async unlink() {
		return promises.unlink(this.path)
	}

	unlinkSync() {
		return unlinkSync(this.path)
	}

	async read() {
		return promises.readFile(this.path)
	}

	readSync() {
		return readFileSync(this.path)
	}
}

export const cookieJar = new CookieJar()
export const got = gotScraping.extend({
    headers: {
        accept: "*/*",
        'accept-language': "en-US,en;q=0.9"
    },
    cookieJar,
    hooks: {
        init: [
            (plain, options) => {
                if (plain.form && typeof plain.form === 'object') {
                    let isNormal = true
                    let search = new URLSearchParams
                    for (let key in plain.form) {
                        let value = plain.form[key]
                        if (Array.isArray(value)) {
                            isNormal = false
                            for (let val of value)
                                search.append(key + '[]', val)
                        } else search.append(key, value)
                    }
                    if (!isNormal) {
                        plain.headers = options.headers || {}
                        plain.headers['content-type'] = 'application/x-www-form-urlencoded'
                        plain.body = search.toString()
                    }
                }
            }
        ],
        afterResponse: [
            response => {
                let body = response.rawBody
                try {
                    response.body = JSON.parse(body.toString())
                    // if (!/^application\/.*?json$/.test(response.headers['content-type']) || !/^[{\[()]]|[}\])]$/.test(body.toString())) throw new TypeError('Not a JSON')
                } catch (e) {
                    if (response.headers['content-type']?.startsWith('text/') || response.statusCode >= 500) {
                        response.body = body.toString()
                        if (response.statusCode >= 500) response.body = `(${response.statusCode}) ${response.statusMessage}`
                    } else {
                        response.body = body
                    }
                }
                return response
            }
        ]
    }
})
