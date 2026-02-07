import cp from 'child_process'
import TempFile from './TempFile.js'

export const ffmpeg = (buffer, args = [], ext = '', ext2 = '') => {
  return new Promise((resolve, reject) => {
    const executeAsync = async () => {
      const tmp = new TempFile('ffmpeg-input-', ext ? `.${ext}` : '')
      const out = new TempFile('ffmpeg-output-', ext2 ? `.${ext2}` : '')

      try {
        await tmp.write(buffer)
      await out.create()
      cp.spawn('ffmpeg', ['-y', '-i', tmp.filePath, ...args, out.filePath])
        .once('error', async (e) => {
          await tmp.remove()
          await out.remove()
          reject(e)
        })
        .once('close', async () => {
          if (await out.exists()) {
            const outputBuffer = await out.read()
            await Promise.all([tmp.remove(), out.remove()])
            resolve(outputBuffer)
          } else {
            await Promise.all([tmp.remove(), out.remove()])
            reject(new Error(`FFmpeg process completed but output file was not found: ${out}`))
          }
        })
      } catch (e) {
        await tmp.remove()
        await out.remove()
        reject(e)
      }
    }
    executeAsync()
  })
}

// Audio/Video/Image converters
export const toPTT = (buffer, ext) =>
  ffmpeg(buffer, ['-vn', '-c:a', 'libopus', '-b:a', '128k', '-vbr', 'on'], ext, 'ogg')

export const toAudio = (buffer, ext) =>
  ffmpeg(
    buffer,
    ['-vn', '-c:a', 'libopus', '-b:a', '128k', '-vbr', 'on', '-compression_level', '10'],
    ext,
    'opus',
  )

export const toVideo = (buffer, ext) =>
  ffmpeg(
    buffer,
    [
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-ab',
      '128k',
      '-ar',
      '44100',
      '-crf',
      '51',
      '-preset',
      'veryfast',
    ],
    ext,
    'mp4',
  )

export const toImage = (buffer, ext) => ffmpeg(buffer, ['-c:v', 'png'], ext, 'png')

export function videoFilter(filters) {
  return filters
    .map((filter) => {
      return Object.entries(filter)
        .map(([name, value]) => {
          if (typeof value === 'boolean') {
            return value ? `${name}=1` : `${name}=0`
          }
          if (typeof value === 'number') {
            return `${name}=${value}`
          }
          if (typeof value === 'string' && !value.includes(' ')) {
            return `${name}=${value}`
          }
          if (Array.isArray(value)) {
            return `${name}=${value.join(':')}`
          }
          if (typeof value === 'object') {
            return `${name}=${Object.entries(value)
              .map(([k, v]) => `${k}=${v}`)
              .join(':')}`
          }
        })
        .join(',')
    })
    .join(',')
}
