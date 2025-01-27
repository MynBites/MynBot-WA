export default function say(string) {
    if (!string || typeof string !== 'string') throw new Error('Must be type of string')
    console.log(`Hi, ${string}!`)
    return true
}

if (process.argv[1] === import.meta.filename) {
  say('Hello World')
}
