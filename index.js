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
    const defaults = {
      title: '',
      location: '',
      directory: 'logs',
      useTimeInTitle: true,
      useDateDirectories: true,
      daysTillDelete: 7
    }
    let { location, directory, title, useTimeInTitle, useDateDirectories, daysTillDelete } = { ...defaults, ...options }
    const now = new Date()
    const timeStampString = 'HH.MM.ss.l'
    const dateStampString = 'mm-dd-yy'
    const logTextString = useDateDirectories? timeStampString: `${dateStampString} ${timeStampString}`
    const timeStamp = dateformat(now, timeStampString)
    const dateStamp = dateformat(now, dateStampString)
    const CURRENT_DIR = path.dirname(require.main.filename)
    const logPath = path.normalize(`${CURRENT_DIR}/${location}${directory}`)
    let logPathWithDate = logPath
    if (useDateDirectories) {
      logPathWithDate = path.normalize(`${logPath}/${dateStamp}`)
    }
    this.createFolder(logPath)
    this.createFolder(logPathWithDate)
    const findRemoveSyncOptions = {
      age: {
        seconds: daysTillDelete * 86400 // One day.
      },
      extensions: ['.log'],
      dir: '*'
    }
    findRemoveSync(logPath, findRemoveSyncOptions)
    this.logstamp = `${dateStamp} ${timeStamp}.log`
    title = title.length ? title + ' ' : ''
    logifier.on(this.logstamp, log => {
      let logText = `[${dateformat(new Date(), logTextString)}] `
      let logTitle = `${title}`
      if (useTimeInTitle && title.length) {
        logTitle += ` ${dateStamp} ${timeStamp}`
      }
      log = Array.isArray(log) ? log : [log]
      log.forEach(l => {
        logText += JSON.stringify(l) + ' '
      })
      fs.appendFileSync(path.normalize(`${logPathWithDate}/${logTitle}.log`), logText.replace('\\n"', '": ') + '\n')
    })
    if (!useTimeInTitle || !useDateDirectories) {
      let logText = `---------- ---------- [${dateformat(new Date(), logTextString)}] ---------- ----------\n`
      let logTitle = `${title}`
      if (useTimeInTitle && title.length) {
        logTitle += ` ${dateStamp} ${timeStamp}`
      }
      fs.appendFileSync(path.normalize(`${logPathWithDate}/${logTitle}.log`), logText)
    }
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
