import plugin from '../../index.js'
import Lang from '../../util/Language.js'

const time = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 30],
  ['month', 12],
  ['year', 10],
  ['decade', 10],
  ['century', 10],
  ['millennium', 10],
]

plugin.add('fun-pertanyaan', {
  help: [
    'apakah',
    'kapankah',
    'when',
    'is it',
    'will it',
    'can it',
    'does it',
    'do you',
    'are you',
  ],
  prefix: /^(apakah|kapankah|when|is it|will it|can it|does it|do you|are you)/i,
  command: false,
  type: 'fun',
  async onCommand(m, { prefix }) {
    if (prefix.toLowerCase() === 'kapankah' || prefix.toLowerCase() === 'when') {
      let [timeFormat, maxDuration] = pickRandom(time)
      m.reply(
        Lang.format('plugins.fun-pertanyaan.message.time', {
          duration: randRange(1, maxDuration - 1),
          timeFormat: Lang.format(`time.${timeFormat}`),
        }),
      )
    } else {
      m.reply(
        Lang.format(
          'plugins.fun-pertanyaan.message.chance.' +
            pickRandom([
              'yes',
              'no',
              'maybe',
              'ofcourse',
              'ofcourseNot',
              'unknown',
              'askAgain',
              'bigChanceYes',
              'lowChanceYes',
              'bigChanceNo',
              'lowChanceNo',
              'askSomeoneElse',
              'askYourself',
              'askGod',
              'askUniverse',
            ]),
        ),
      )
    }
  },
})

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
