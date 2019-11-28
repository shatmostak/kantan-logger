/*
 * @name       kantan-logger
 * @version    1.0.0
 * @date       2019-11-27
 * @author     Will Shostak <william.shostak@gmail.com> - Matt Shostak <matthewpshostak@gmail.com>
 * @license    ISC License
 */

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
    const logPathWithDate = path.normalize(`${CURRENT_DIR}/${logDirPath}${logDirName}/${dateStamp}`)
    this.createFolder(logPath)
    this.createFolder(logPathWithDate)
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
      fs.appendFileSync(path.normalize(`${logPathWithDate}/${logTitle}${dateStamp} ${timeStamp}.log`), logText.replace('\\n"', '": ') + '\n')
    })
  }

  create (options) {
    return new Kantan(options)
  }

  log () {
    const args = Array.prototype.slice.call(arguments)
    logifier.emit(this.logstamp, args)
  }

  createFolder (dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
  }
}
module.exports = new Kantan()
