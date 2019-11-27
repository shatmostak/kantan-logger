const EventEmitter = require('events').EventEmitter
const logifier = new EventEmitter()
const findRemoveSync = require('find-remove')
const fs = require('fs')
const path = require('path')
const dateformat = require('dateformat')

class Kantan {
  constructor (options) {
    const defaults = { logTitle: '', logDirPath: '', logDirName: 'logs' }
    let { logDirPath, logDirName, logTitle } = { ...defaults, ...options }
    const now = new Date()
    const timeStamp = dateformat(now, 'HH.MM.ss.l')
    const dateStamp = dateformat(now, 'mm-dd-yy')
    const CURRENT_DIR = path.dirname(require.main.filename)
    const logPath = path.normalize(`${CURRENT_DIR}/${logDirPath}${logDirName}`)
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath)
    }

    const findRemoveSyncOptions = {
      age: {
        seconds: 604800 // One week.
      },
      extensions: ['.log']
    }

    findRemoveSync(logPath, findRemoveSyncOptions)
    this.logstamp = `${dateStamp} ${timeStamp}.log`
    logTitle = logTitle.length ? logTitle + ' ' : ''
    logifier.on(this.logstamp, log => {
      let logText = `[${dateformat(new Date(), 'HH.MM.ss.l')}] `
      log = Array.isArray(log) ? log : [log]
      log.forEach(l => {
        logText += JSON.stringify(l) + ' '
      })
      fs.appendFileSync(path.normalize(`${logPath}/${logTitle}${dateStamp} ${timeStamp}.log`), logText.replace('\\n"', '": ') + '\n')
    })
  }

  create (options) {
    return new Kantan(options)
  }

  log () {
    const args = Array.prototype.slice.call(arguments)
    logifier.emit(this.logstamp, args)
  }
}
module.exports = new Kantan()
